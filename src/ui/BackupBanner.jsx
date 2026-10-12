import { daysSince } from '../core/reminder.js'
import { runBackup } from './backupActions.js'

export default function BackupBanner({ lastBackup, lastFull }) {
  const days = daysSince(lastBackup, Date.now())
  const kind = lastFull ? 'incremental' : 'full'
  return (
    <div class="banner" role="alert">
      <span>{days === null ? 'Never backed up' : `No backup in ${days} days`}</span>
      <button class="primary" onClick={() => runBackup(kind)}>Back up now</button>
    </div>
  )
}
