import { beforeEach, describe, expect, test } from 'vitest'
import { createDb } from '../../src/core/db.js'
import { createRepo } from '../../src/core/repo.js'

let repo
let db

function clock() {
  let t = 0
  return () => new Date(Date.UTC(2026, 0, 1) + (t++) * 1000).toISOString()
}

beforeEach(() => {
  db = createDb(`test-${crypto.randomUUID()}`)
  let n = 0
  repo = createRepo(db, { now: clock(), uuid: () => `id-${++n}` })
})

const base = { library: 'axe', name: 'Plumb Dayton', fields: { maker: 'Plumb', pattern: 'Dayton', weight_g: 1590 } }
const img = (...b) => ({ type: 'image/jpeg', data: new Uint8Array(b).buffer })
const shot = n => ({ full: img(n, n), thumb: img(n) })

describe('products', () => {
  test('saveProduct creates, then keeps created_at and bumps updated_at', async () => {
    const p = await repo.saveProduct(base)
    expect(p).toMatchObject({ id: 'id-1', deleted: false, created_at: p.updated_at })
    const updated = await repo.saveProduct({ ...p, name: 'Renamed' })
    expect(updated.created_at).toBe(p.created_at)
    expect(updated.updated_at > p.updated_at).toBe(true)
    expect((await repo.getProduct(p.id)).name).toBe('Renamed')
  })

  test('listProducts filters by library and hides tombstones', async () => {
    const a = await repo.saveProduct(base)
    await repo.saveProduct({ ...base, library: 'other' })
    const c = await repo.saveProduct(base)
    await repo.deleteProduct(c.id)
    expect((await repo.listProducts('axe')).map(p => p.id)).toEqual([a.id])
  })
})

describe('photo slots', () => {
  test('saving with slot changes stores photo and thumb, listed in slot order', async () => {
    const p = await repo.saveProduct(base, { extra: shot(3), profile: shot(1), stamp: shot(2) })
    const thumbs = await repo.listThumbs(p.id)
    expect(thumbs.map(t => t.slot)).toEqual(['profile', 'stamp', 'extra'])
    const photo = await repo.getPhoto(thumbs[1].id)
    expect(photo).toMatchObject({ product_id: p.id, slot: 'stamp', deleted: false })
    expect([...new Uint8Array(photo.data)]).toEqual([2, 2])
    expect([...new Uint8Array(thumbs[1].data)]).toEqual([2])
  })

  test('replacing a slot tombstones the old photo without its bytes', async () => {
    const p = await repo.saveProduct(base, { profile: shot(1) })
    const [old] = await repo.listThumbs(p.id)
    const before = await db.photos.get(old.id)
    await repo.saveProduct(p, { profile: shot(9) })
    const thumbs = await repo.listThumbs(p.id)
    expect(thumbs).toHaveLength(1)
    expect(thumbs[0].id).not.toBe(old.id)
    expect(await repo.getPhoto(old.id)).toBeUndefined()
    const tomb = await db.photos.get(old.id)
    expect(tomb).toMatchObject({ deleted: true, data: null })
    expect(tomb.updated_at > before.updated_at).toBe(true)
    expect(await repo.getThumb(old.id)).toBeUndefined()
  })

  test('null removes a slot; slots left out are untouched', async () => {
    const p = await repo.saveProduct(base, { profile: shot(1), stamp: shot(2) })
    await repo.saveProduct(p, { stamp: null })
    expect((await repo.listThumbs(p.id)).map(t => t.slot)).toEqual(['profile'])
  })

  test('unknown slots are ignored', async () => {
    const p = await repo.saveProduct(base, { bogus: shot(1) })
    expect(await repo.listThumbs(p.id)).toEqual([])
  })

  test('deleteProduct tombstones the product and all its photos', async () => {
    const p = await repo.saveProduct(base, { profile: shot(1), stamp: shot(2) })
    await repo.deleteProduct(p.id)
    expect(await repo.getProduct(p.id)).toBeUndefined()
    expect(await repo.listThumbs(p.id)).toEqual([])
    const photos = await db.photos.where('product_id').equals(p.id).toArray()
    expect(photos).toHaveLength(2)
    expect(photos.every(ph => ph.deleted && ph.data === null)).toBe(true)
  })
})

test('meta get and set', async () => {
  expect(await repo.getMeta('last_backup_at')).toBeNull()
  await repo.setMeta('last_backup_at', '2026-01-01T00:00:00.000Z')
  expect(await repo.getMeta('last_backup_at')).toBe('2026-01-01T00:00:00.000Z')
})
