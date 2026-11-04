// Pixel size from a JPEG's frame header, without decoding the image. null if not found.
export function jpegSize(buffer) {
  const b = new Uint8Array(buffer)
  if (b[0] !== 0xff || b[1] !== 0xd8) return null
  let i = 2
  while (i + 9 < b.length) {
    if (b[i] !== 0xff) return null
    const marker = b[i + 1]
    // SOF0-SOF15 carry the size; C4 (huffman), C8 (reserved) and CC (arithmetic) don't
    if (marker >= 0xc0 && marker <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(marker)) {
      return { height: (b[i + 5] << 8) | b[i + 6], width: (b[i + 7] << 8) | b[i + 8] }
    }
    i += 2 + ((b[i + 2] << 8) | b[i + 3])
  }
  return null
}

// Rebuilds thumbnails smaller than `edge` from their full photos, one at a time to keep memory flat.
// Thumbs have no updated_at, so this never shows up as "changes" for the next backup.
// Resumable: rows already at size are skipped, and the meta flag is only set once every row is done.
export async function regenerateThumbs(db, { edge, makeThumb }) {
  if ((await db.meta.get('thumb_edge'))?.value === edge) return 0
  let upgraded = 0
  for (const id of await db.thumbs.toCollection().primaryKeys()) {
    const thumb = await db.thumbs.get(id)
    if (!thumb) continue
    const size = jpegSize(thumb.data)
    if (size && Math.max(size.width, size.height) >= edge) continue
    const photo = await db.photos.get(id)
    if (!photo || photo.deleted || !photo.data) continue
    // Already as large as the original allows
    const full = jpegSize(photo.data)
    if (full && size && Math.max(full.width, full.height) <= Math.max(size.width, size.height)) continue
    const next = await makeThumb(photo)
    // update() is a no-op if the photo was replaced or deleted meanwhile
    upgraded += await db.thumbs.update(id, { type: next.type, data: next.data })
  }
  await db.meta.put({ key: 'thumb_edge', value: edge })
  return upgraded
}
