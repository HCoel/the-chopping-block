import { useState } from 'preact/hooks'
import { canShareFile, shareFile } from '../core/share.js'
import { closeBackup, download, markBackedUp, useBackupSheet } from './backupActions.js'
import { guard, toast } from './toast.jsx'

const size = bytes => (bytes >= 1_000_000 ? `${(bytes / 1_000_000).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1000))} KB`)
const isAndroid = () => /android/i.test(navigator.userAgent)

export default function BackupSheet() {
  const backup = useBackupSheet()
  const [error, setError] = useState(null)
  if (!backup) return null

  const close = () => {
    setError(null)
    closeBackup()
  }
  const done = async () => {
    await guard(() => markBackedUp(backup))
    toast('Backup saved')
    close()
  }

  if (backup.building) {
    return (
      <div class="sheet-backdrop">
        <div class="sheet" role="dialog" aria-label="Backup">
          <h2>Building backup…</h2>
          <p class="muted">Large collections can take a little while.</p>
        </div>
      </div>
    )
  }

  // No awaits before shareFile: it must run inside this tap
  const onShare = () => shareFile(backup.file).then(({ result, error: e }) => {
    if (result === 'shared') return done()
    if (result === 'failed') setError(e)
    return undefined
  })
  const onSave = () => {
    download(backup.file)
    done()
  }
  const shareable = canShareFile(backup.file)

  return (
    <div class="sheet-backdrop" onClick={e => e.target === e.currentTarget && close()}>
      <div class="sheet" role="dialog" aria-label="Backup ready">
        <h2>Backup ready</h2>
        <p class="muted">{backup.file.name} · {size(backup.file.size)}</p>
        {error && <p class="error">Sharing didn't work ({error}). Use Save to device instead.</p>}
        <div class="row">
          {shareable && <button class={error ? '' : 'primary'} onClick={onShare}>Share</button>}
          <button class={shareable && !error ? '' : 'primary'} onClick={onSave}>Save to device</button>
        </div>
        <p class="muted">
          {isAndroid()
            ? 'Save puts the file in Downloads. Then open the Google Drive app, tap +, Upload, and pick it from Downloads.'
            : 'Save puts the file in Files > Downloads, which is in iCloud Drive by default.'}
        </p>
        <button onClick={close}>Close</button>
      </div>
    </div>
  )
}
