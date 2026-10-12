import Dexie from 'dexie'

export const SLOTS = ['profile', 'stamp', 'extra']

// thumbs hold one small JPEG per live photo, keyed by photo id. The grid reads only thumbs,
// because Dexie loads whole rows and full photos would pull megabytes per screen.
export function createDb(name = 'the-chopping-block') {
  const db = new Dexie(name)
  db.version(1).stores({
    products: 'id, library, updated_at',
    photos: 'id, product_id, updated_at',
    thumbs: 'id, product_id',
    meta: 'key',
  })
  return db
}
