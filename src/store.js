import { createDb } from './core/db.js'
import { createRepo } from './core/repo.js'
import { regenerateThumbs } from './core/thumbs.js'
import { THUMB_EDGE, thumbFromPhoto } from './core/image.js'

export const db = createDb()
export const repo = createRepo(db)

export async function init() {
  try {
    await navigator.storage?.persist?.()
  } catch {
    // persistence is best effort; the backup reminder covers the rest
  }
}

// true / false, or null where the browser can't say
export async function isPersisted() {
  try {
    return (await navigator.storage?.persisted?.()) ?? null
  } catch {
    return null
  }
}

// Background, after first render: upgrades thumbnails made at an older size. Safe to call repeatedly.
let upgrading = null
export function upgradeThumbs() {
  upgrading ??= regenerateThumbs(db, { edge: THUMB_EDGE, makeThumb: thumbFromPhoto })
    .catch(e => console.error('Thumbnail upgrade failed', e))
    .finally(() => { upgrading = null })
  return upgrading
}
