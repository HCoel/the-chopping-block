import { describe, expect, test } from 'vitest'
import { strToU8, zipSync } from 'fflate'
import { createDb } from '../../src/core/db.js'
import { createRepo } from '../../src/core/repo.js'
import {
  ImportError, applyImport, backupFilename, buildBackup, mergeBackups, planImport, readBackup,
} from '../../src/core/export.js'

let n = 0
const freshRepo = (start = Date.UTC(2026, 0, 1)) => {
  let t = 0
  return createRepo(createDb(`test-${crypto.randomUUID()}`), {
    now: () => new Date(start + (t++) * 1000).toISOString(),
    uuid: () => `id-${++n}`,
  })
}
const base = { library: 'axe', name: 'Plumb Dayton', fields: { maker: 'Plumb', pattern: 'Dayton' } }
const img = (...b) => ({ type: 'image/jpeg', data: new Uint8Array(b).buffer })
const shot = v => ({ full: img(v, v, v), thumb: img(v) })

async function populated() {
  const repo = freshRepo()
  const p = await repo.saveProduct(base, { profile: shot(1), stamp: shot(2) })
  await repo.saveProduct(p, { stamp: shot(3) }) // leaves a photo tombstone
  const gone = await repo.saveProduct({ ...base, name: 'Gone' }, { profile: shot(4) })
  await repo.deleteProduct(gone.id)
  return { repo, product: p }
}

const snapshot = async db => {
  const out = {}
  for (const t of ['products', 'photos', 'thumbs']) {
    out[t] = (await db.table(t).toArray())
      .map(r => (r.data ? { ...r, data: [...new Uint8Array(r.data)] } : r))
      .sort((a, b) => a.id.localeCompare(b.id))
  }
  return out
}

const backup = async (db, opts) => (await buildBackup(db, { exportedAt: 'x', ...opts })).blob.arrayBuffer()

async function restore(target, ...buffers) {
  const plan = await planImport(target.db, mergeBackups(buffers.map(readBackup)))
  await applyImport(target.db, plan)
  return plan
}

describe('full backup', () => {
  test('round trip into an empty database reproduces every record, tombstones included', async () => {
    const { repo } = await populated()
    const target = freshRepo()
    const plan = await restore(target, await backup(repo.db, { kind: 'full' }))
    expect(plan.counts.products).toEqual({ new: 2, updated: 0, unchanged: 0 })
    expect(plan.counts.photos).toEqual({ new: 4, updated: 0, unchanged: 0 })
    expect(await snapshot(target.db)).toEqual(await snapshot(repo.db))
  })

  test('the zip holds bytes only for live photos', async () => {
    const { repo } = await populated()
    const { counts } = await buildBackup(repo.db, { kind: 'full', exportedAt: 'x' })
    expect(counts).toEqual({ products: 2, photos: 4 })
    const data = readBackup(await backup(repo.db, { kind: 'full' }))
    expect(data.photos.filter(p => p.data).length).toBe(2)
    expect(Object.keys(data.thumbs)).toHaveLength(2)
    expect(data.manifest).toMatchObject({ app: 'the-chopping-block', kind: 'full', format_version: 1 })
  })

  test('stored photos own their bytes, not a view into the whole zip', async () => {
    const { repo } = await populated()
    const data = readBackup(await backup(repo.db, { kind: 'full' }))
    const live = data.photos.find(p => p.data)
    expect(live.data.byteLength).toBe(3)
  })
})

describe('incremental backup', () => {
  test('holds only rows changed after `since`, including tombstones', async () => {
    const { repo, product } = await populated()
    // populated() writes within the first seconds of 2026; later edits happen two hours on
    const since = new Date(Date.UTC(2026, 0, 1) + 3600_000).toISOString()
    const later = createRepo(repo.db, { now: () => new Date(Date.UTC(2026, 0, 1) + 7200_000).toISOString(), uuid: () => `late-${++n}` })
    await later.saveProduct({ ...product, name: 'Renamed' }, { extra: shot(7) })
    const data = readBackup(await backup(repo.db, { kind: 'incremental', since }))
    expect(data.manifest.kind).toBe('incremental')
    expect(data.products.map(p => p.name)).toEqual(['Renamed'])
    expect(data.photos.map(p => p.slot)).toEqual(['extra'])
  })

  test('needs a since time', async () => {
    const { repo } = await populated()
    await expect(buildBackup(repo.db, { kind: 'incremental', since: null, exportedAt: 'x' })).rejects.toThrow()
  })

  test('full + incrementals restore the same state in any order', async () => {
    const { repo, product } = await populated()
    const full = await backup(repo.db, { kind: 'full' })
    const at = h => new Date(Date.UTC(2026, 0, 1) + h * 3600_000).toISOString()
    const step = (h, fn) => fn(createRepo(repo.db, { now: () => at(h), uuid: () => `s${h}-${++n}` }))

    await step(1, r => r.saveProduct({ ...product, name: 'First edit' }, { profile: shot(8) }))
    const incr1 = await backup(repo.db, { kind: 'incremental', since: at(0.5) })
    await step(2, async r => {
      await r.saveProduct({ ...(await r.getProduct(product.id)), name: 'Second edit' }, { stamp: null })
      await r.saveProduct({ ...base, name: 'New one' }, { profile: shot(9) })
    })
    const incr2 = await backup(repo.db, { kind: 'incremental', since: at(1.5) })

    const expected = await snapshot(repo.db)
    for (const order of [[full, incr1, incr2], [incr2, incr1, full], [incr1, full, incr2]]) {
      const target = freshRepo()
      await restore(target, ...order)
      expect(await snapshot(target.db)).toEqual(expected)
    }
    // Separate imports, one file at a time, reverse order
    const target = freshRepo()
    for (const b of [incr2, incr1, full]) await restore(target, b)
    expect(await snapshot(target.db)).toEqual(expected)
  })
})

describe('merge on import', () => {
  test('newer incoming wins, older is ignored, tombstones apply', async () => {
    const { repo, product } = await populated()
    const target = freshRepo()
    await restore(target, await backup(repo.db, { kind: 'full' }))
    const data = readBackup(await backup(repo.db, { kind: 'full' }))
    const live = data.products.find(p => p.id === product.id)
    const withProducts = products => ({ ...data, products, photos: [] })

    let plan = await planImport(target.db, withProducts([{ ...live, name: 'Newer', updated_at: '2027-01-01T00:00:00.000Z' }]))
    expect(plan.counts.products).toEqual({ new: 0, updated: 1, unchanged: 0 })
    await applyImport(target.db, plan)
    expect((await target.db.products.get(live.id)).name).toBe('Newer')

    plan = await planImport(target.db, withProducts([{ ...live, name: 'Older', updated_at: '2020-01-01T00:00:00.000Z' }]))
    expect(plan.counts.products).toEqual({ new: 0, updated: 0, unchanged: 1 })

    await applyImport(target.db, await planImport(target.db, withProducts([{ ...live, deleted: true, updated_at: '2028-01-01T00:00:00.000Z' }])))
    expect((await target.db.products.get(live.id)).deleted).toBe(true)
  })

  test('a newer photo tombstone removes the local thumb', async () => {
    const { repo, product } = await populated()
    const target = freshRepo()
    await restore(target, await backup(repo.db, { kind: 'full' }))
    const later = createRepo(repo.db, { now: () => '2027-01-01T00:00:00.000Z', uuid: () => `t-${++n}` })
    await later.saveProduct(product, { profile: null })
    await restore(target, await backup(repo.db, { kind: 'incremental', since: '2026-06-01T00:00:00.000Z' }))
    const thumbs = await createRepo(target.db).listThumbs(product.id)
    expect(thumbs.map(t => t.slot)).toEqual(['stamp'])
  })
})

// Bad files are rejected, partial failures roll back
describe('rejecting bad backups', () => {
  const ts = '2030-01-01T00:00:00.000Z'
  const manifest = { format_version: 1, app: 'the-chopping-block', kind: 'full' }
  const zipOf = (files) => zipSync(Object.fromEntries(Object.entries(files).map(([k, v]) => [k, typeof v === 'string' ? strToU8(v) : v]))).buffer
  const json = JSON.stringify
  const good = { products: [], photos: [] }

  test.each([
    ['not a zip', new TextEncoder().encode('hello').buffer, /not a zip/],
    ['no manifest', zipOf({ 'data.json': json(good) }), /missing manifest.json/],
    ['other app', zipOf({ 'manifest.json': json({ ...manifest, app: 'spool-library' }), 'data.json': json(good) }), /different app/],
    ['new version', zipOf({ 'manifest.json': json({ ...manifest, format_version: 2 }), 'data.json': json(good) }), /Unsupported backup version: 2/],
    ['damaged data', zipOf({ 'manifest.json': json(manifest), 'data.json': '{' }), /damaged data.json/],
    ['missing table', zipOf({ 'manifest.json': json(manifest), 'data.json': json({ products: [] }) }), /missing "photos"/],
    ['bad product', zipOf({ 'manifest.json': json(manifest), 'data.json': json({ products: [{ id: 'x', updated_at: ts, library: 'axe', name: 'x' }], photos: [] }) }), /Bad record in "products" \(#1\)/],
    ['bad date', zipOf({ 'manifest.json': json(manifest), 'data.json': json({ products: [{ id: 'x', updated_at: 'soon', library: 'axe', name: 'x', fields: {} }], photos: [] }) }), /Bad record in "products"/],
    ['bad slot', zipOf({ 'manifest.json': json(manifest), 'data.json': json({ products: [], photos: [{ id: 'p', updated_at: ts, product_id: 'x', slot: 'side', type: 'image/jpeg' }] }) }), /Bad record in "photos"/],
    ['missing photo file', zipOf({ 'manifest.json': json(manifest), 'data.json': json({ products: [], photos: [{ id: 'p', updated_at: ts, product_id: 'x', slot: 'stamp', type: 'image/jpeg' }] }) }), /missing a photo/],
  ])('%s', (_, buffer, message) => {
    expect(() => readBackup(buffer)).toThrow(ImportError)
    expect(() => readBackup(buffer)).toThrow(message)
  })

  test('a failure mid-write leaves the database untouched', async () => {
    const target = freshRepo()
    const plan = {
      counts: {},
      writes: {
        products: [{ id: 'ok', library: 'axe', updated_at: 'x', fields: {} }],
        photos: [{ updated_at: 'x' }], // no primary key: bulkPut throws
      },
    }
    await expect(applyImport(target.db, plan)).rejects.toThrow()
    expect(await target.db.products.count()).toBe(0)
  })
})

test('backupFilename uses local date and time, and the kind', () => {
  const d = new Date(2026, 9, 12, 7, 5)
  expect(backupFilename('full', d)).toBe('the-chopping-block-full-2026-10-12-0705.zip')
  expect(backupFilename('incremental', d)).toBe('the-chopping-block-incr-2026-10-12-0705.zip')
})
