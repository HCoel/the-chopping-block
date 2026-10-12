const DAY_MS = 86_400_000
export const BACKUP_DAYS = 14
export const FULL_BACKUP_DAYS = 60

export function daysSince(iso, nowMs) {
  if (!iso) return null
  return Math.floor((nowMs - Date.parse(iso)) / DAY_MS)
}

export function needsBackup(lastIso, productCount, nowMs) {
  if (productCount === 0) return false
  const days = daysSince(lastIso, nowMs)
  return days === null || days >= BACKUP_DAYS
}

// Incrementals depend on a full backup; an old full one means a long chain to restore
export function needsFullBackup(lastFullIso, productCount, nowMs) {
  if (productCount === 0) return false
  const days = daysSince(lastFullIso, nowMs)
  return days === null || days >= FULL_BACKUP_DAYS
}
