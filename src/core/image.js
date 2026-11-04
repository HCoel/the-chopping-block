// Long edge in px. The stamp is kept large so faint or partial stamps can be zoomed.
export const MAX_EDGE = { profile: 1200, stamp: 2400, extra: 1200 }
// 640 covers a 2-column grid tile on a 3x phone screen (~510 physical px)
export const THUMB_EDGE = 640
export const THUMB_QUALITY = 0.75

export function fitWithin(width, height, maxEdge) {
  const scale = Math.min(1, maxEdge / Math.max(width, height))
  return { width: Math.round(width * scale), height: Math.round(height * scale) }
}

export async function decode(file) {
  try {
    return await createImageBitmap(file)
  } catch {
    // Fallback for formats createImageBitmap rejects (e.g. some HEIC files): let <img> decode it
    const url = URL.createObjectURL(file)
    try {
      const img = new Image()
      img.src = url
      await img.decode()
      return img
    } finally {
      URL.revokeObjectURL(url)
    }
  }
}

export async function encode(source, maxEdge, quality) {
  const { width, height } = fitWithin(source.width, source.height, maxEdge)
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  canvas.getContext('2d').drawImage(source, 0, 0, width, height)
  const blob = await new Promise((resolve, reject) =>
    canvas.toBlob(b => (b ? resolve(b) : reject(new Error('Image encode failed'))), 'image/jpeg', quality))
  return { type: 'image/jpeg', data: await blob.arrayBuffer() }
}

// One decode, two encodes: the slot-sized photo and its grid thumbnail
export async function processPhoto(file, slot) {
  const source = await decode(file)
  return {
    full: await encode(source, MAX_EDGE[slot] ?? 1200, 0.8),
    thumb: await encode(source, THUMB_EDGE, THUMB_QUALITY),
  }
}

// Rebuild a grid thumbnail from a stored full-size photo
export async function thumbFromPhoto(photo) {
  return encode(await decode(new Blob([photo.data], { type: photo.type })), THUMB_EDGE, THUMB_QUALITY)
}
