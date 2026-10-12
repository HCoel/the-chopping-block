import { backupFilename, buildBackup } from '../core/export.js'
import { deliverFile } from '../core/share.js'
import { db, repo } from '../store.js'
import { guard, toast } from './toast.jsx'

function download(file) {
  const url = URL.createObjectURL(file)
  const a = Object.assign(document.createElement('a'), { href: url, download: file.name })
  document.body.append(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 60_000)
}

async function deliver(file, kind, startedAt) {
  const result = await deliverFile(file, { download })
  if (result === 'shared' || result === 'downloaded') {
    // The start time, not the end: anything edited while the backup was being built goes in the next one
    await repo.setMeta('last_backup_at', startedAt)
    if (kind === 'full') await repo.setMeta('last_full_backup_at', startedAt)
    return true
  }
  if (result === 'blocked') {
    // The retry tap counts as a fresh user gesture, which share() requires
    toast('Backup ready', { action: { label: 'Share now', run: () => deliver(file, kind, startedAt) }, timeout: 0 })
  }
  return false
}

// kind: 'full' | 'incremental'. Incremental falls back to full when there is nothing to build on.
export async function exportBackup(kind = 'full') {
  const since = await repo.getMeta('last_backup_at')
  const lastFull = await repo.getMeta('last_full_backup_at')
  const actual = kind === 'incremental' && since && lastFull ? 'incremental' : 'full'
  const now = new Date()
  const startedAt = now.toISOString()
  const { blob } = await buildBackup(db, { kind: actual, since, exportedAt: startedAt })
  const file = new File([blob], backupFilename(actual, now), { type: 'application/zip' })
  return deliver(file, actual, startedAt)
}

export function runBackup(kind) {
  return guard(() => exportBackup(kind), "Couldn't export - try again")
}
