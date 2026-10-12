import { useEffect, useState } from 'preact/hooks'
import { backupFilename, buildBackup } from '../core/export.js'
import { db, repo } from '../store.js'
import { guard } from './toast.jsx'

export function download(file) {
  const url = URL.createObjectURL(file)
  const a = Object.assign(document.createElement('a'), { href: url, download: file.name })
  document.body.append(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 60_000)
}

// kind: 'full' | 'incremental'. Incremental falls back to full when there is nothing to build on.
export async function buildBackupFile(kind = 'full') {
  const since = await repo.getMeta('last_backup_at')
  const lastFull = await repo.getMeta('last_full_backup_at')
  const actual = kind === 'incremental' && since && lastFull ? 'incremental' : 'full'
  const now = new Date()
  const startedAt = now.toISOString()
  const { blob, counts } = await buildBackup(db, { kind: actual, since, exportedAt: startedAt })
  const file = new File([blob], backupFilename(actual, now), { type: 'application/zip' })
  return { file, kind: actual, startedAt, counts }
}

// The start time, not the end: anything edited while the backup was being built goes in the next one
export async function markBackedUp({ kind, startedAt }) {
  await repo.setMeta('last_backup_at', startedAt)
  if (kind === 'full') await repo.setMeta('last_full_backup_at', startedAt)
}

// Building and delivering are two taps: building can outlast the browser's gesture window,
// and the share sheet only opens straight from a tap
let current = null
const listeners = new Set()
const emit = () => listeners.forEach(l => l(current))

export function closeBackup() {
  current = null
  emit()
}

export async function runBackup(kind) {
  current = { building: true, kind }
  emit()
  const built = await guard(() => buildBackupFile(kind), "Couldn't build the backup - try again")
  current = built ?? null
  emit()
}

export function useBackupSheet() {
  const [state, setState] = useState(current)
  useEffect(() => {
    listeners.add(setState)
    return () => listeners.delete(setState)
  }, [])
  return state
}

// Last resort from the crash screen: no sheet is mounted there, so build and download in one go
export async function emergencyBackup() {
  const built = await buildBackupFile('full')
  download(built.file)
  await markBackedUp(built)
}
