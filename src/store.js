import { createDb } from './core/db.js'
import { createRepo } from './core/repo.js'

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
