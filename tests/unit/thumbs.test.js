import { beforeEach, describe, expect, test, vi } from 'vitest'
import { createDb } from '../../src/core/db.js'
import { createRepo } from '../../src/core/repo.js'
import { jpegSize, regenerateThumbs, shouldTurn } from '../../src/core/thumbs.js'

// Minimal JPEG: SOI, an APP0 segment to skip over, then SOF0 with height/width
function fakeJpeg(width, height) {
  return new Uint8Array([
    0xff, 0xd8,
    0xff, 0xe0, 0x00, 0x04, 0x4a, 0x46,
    0xff, 0xc0, 0x00, 0x11, 0x08, height >> 8, height & 255, width >> 8, width & 255, 0x03, 0, 0, 0, 0, 0, 0, 0, 0, 0,
  ]).buffer
}
const jpeg = (w, h) => ({ type: 'image/jpeg', data: fakeJpeg(w, h) })

describe('jpegSize', () => {
  test('reads the frame header after other segments', () => {
    expect(jpegSize(fakeJpeg(640, 480))).toEqual({ width: 640, height: 480 })
    expect(jpegSize(fakeJpeg(900, 1200))).toEqual({ width: 900, height: 1200 })
  })
  test('null for non-JPEG data', () => {
    expect(jpegSize(new Uint8Array([0x89, 0x50, 0x4e, 0x47]).buffer)).toBeNull()
  })
})

describe('regenerateThumbs', () => {
  let db
  let repo
  let n = 0
  beforeEach(() => {
    db = createDb(`test-${crypto.randomUUID()}`)
    repo = createRepo(db, { now: () => '2026-01-01T00:00:00.000Z', uuid: () => `id-${++n}` })
  })
  const makeThumb = vi.fn(async () => jpeg(640, 480))

  test('upgrades small thumbs, skips ones at size, leaves photos untouched', async () => {
    makeThumb.mockClear()
    const p = await repo.saveProduct(
      { library: 'axe', name: 'x', fields: {} },
      { profile: { full: jpeg(1200, 900), thumb: jpeg(320, 240) }, stamp: { full: jpeg(2400, 1800), thumb: jpeg(640, 480) } },
    )
    const before = await db.photos.toArray()
    expect(await regenerateThumbs(db, { edge: 640, makeThumb })).toBe(1)
    expect(makeThumb).toHaveBeenCalledTimes(1)
    const sizes = (await repo.listThumbs(p.id)).map(t => jpegSize(t.data).width)
    expect(sizes).toEqual([640, 640])
    expect(await db.photos.toArray()).toEqual(before) // no updated_at bump: not a "change" for backups
  })

  test('runs once, then again after the flag is cleared (e.g. by an import)', async () => {
    makeThumb.mockClear()
    await repo.saveProduct({ library: 'axe', name: 'x', fields: {} }, { profile: { full: jpeg(1200, 900), thumb: jpeg(320, 240) } })
    await regenerateThumbs(db, { edge: 640, makeThumb })
    const [t] = await db.thumbs.toArray()
    await db.thumbs.update(t.id, { data: fakeJpeg(320, 240) })
    expect(await regenerateThumbs(db, { edge: 640, makeThumb })).toBe(0)
    await db.meta.delete('thumb_edge')
    expect(await regenerateThumbs(db, { edge: 640, makeThumb })).toBe(1)
  })

  test('skips when the original is no bigger than its thumb', async () => {
    makeThumb.mockClear()
    await repo.saveProduct({ library: 'axe', name: 'x', fields: {} }, { profile: { full: jpeg(300, 200), thumb: jpeg(300, 200) } })
    expect(await regenerateThumbs(db, { edge: 640, makeThumb })).toBe(0)
    expect(makeThumb).not.toHaveBeenCalled()
  })
})

describe('shouldTurn', () => {
  const portrait = { width: 480, height: 640 }
  const landscape = { width: 640, height: 480 }
  test.each([
    ['profile', portrait, true],
    ['extra', portrait, true],
    ['stamp', portrait, false],
    ['profile', landscape, false],
    ['profile', { width: 500, height: 500 }, false],
    ['profile', null, false],
    [undefined, portrait, false],
  ])('%s %o -> %s', (slot, size, expected) => expect(shouldTurn(slot, size)).toBe(expected))
})
