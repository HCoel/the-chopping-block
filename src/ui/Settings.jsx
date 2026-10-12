import { useEffect, useState } from 'preact/hooks'
import { db, isPersisted, repo } from '../store.js'
import { ImportError, TABLES, applyImport, mergeBackups, planImport, readBackup } from '../core/export.js'
import { daysSince, needsBackup, needsFullBackup } from '../core/reminder.js'
import { runBackup } from './backupActions.js'
import { guard, toast } from './toast.jsx'
import { useLive } from './useLive.js'

function ImportPreview({ plan, files, onApply, onCancel }) {
  const changes = TABLES.reduce((sum, t) => sum + plan.counts[t].new + plan.counts[t].updated, 0)
  return (
    <div class="sheet-backdrop">
      <div class="sheet" role="dialog" aria-label="Import preview">
        <h2>Import preview</h2>
        <p class="muted">{files} file{files === 1 ? '' : 's'}</p>
        <table class="preview">
          <thead><tr><th /><th>New</th><th>Updated</th><th>Unchanged</th></tr></thead>
          <tbody>
            {TABLES.map(t => (
              <tr key={t}><td>{t === 'products' ? 'axes' : t}</td><td>{plan.counts[t].new}</td><td>{plan.counts[t].updated}</td><td>{plan.counts[t].unchanged}</td></tr>
            ))}
          </tbody>
        </table>
        <p class="muted">Records only replace yours when the backup copy is newer.</p>
        <div class="row">
          <button onClick={onCancel}>Cancel</button>
          <button class="primary" disabled={changes === 0} onClick={onApply}>{changes === 0 ? 'Nothing to import' : 'Apply'}</button>
        </div>
      </div>
    </div>
  )
}

const ago = days => (days === null ? 'never' : days === 0 ? 'today' : `${days} day${days === 1 ? '' : 's'} ago`)

async function countChanges(since) {
  if (!since) return null
  const [p, ph] = await Promise.all([
    db.products.where('updated_at').above(since).count(),
    db.photos.where('updated_at').above(since).count(),
  ])
  return p + ph
}

export default function Settings({ lib }) {
  const products = useLive(() => repo.listProducts(lib.id), [lib.id], [])
  const lastBackup = useLive(() => repo.getMeta('last_backup_at'), [], null)
  const lastFull = useLive(() => repo.getMeta('last_full_backup_at'), [], null)
  const changes = useLive(() => countChanges(lastBackup), [lastBackup], null)
  const [persisted, setPersisted] = useState(null)
  const [pending, setPending] = useState(null)
  const now = Date.now()
  const overdue = needsBackup(lastBackup, products.length, now)
  const fullDue = needsFullBackup(lastFull, products.length, now)

  useEffect(() => { isPersisted().then(setPersisted) }, [])

  async function onImportFiles(e) {
    const input = e.currentTarget
    const files = [...(input.files ?? [])]
    input.value = ''
    if (files.length === 0) return
    try {
      const backups = []
      for (const f of files) backups.push(readBackup(await f.arrayBuffer()))
      const data = mergeBackups(backups)
      setPending({ plan: await planImport(db, data), files: files.length })
    } catch (err) {
      toast(err instanceof ImportError ? err.message : "Couldn't read that file")
    }
  }

  async function apply() {
    const ok = await guard(async () => { await applyImport(db, pending.plan); return true }, 'Import failed - nothing was changed')
    if (ok) {
      toast('Backup imported')
      setPending(null)
    }
  }

  return (
    <>
      <header class="bar">
        <a class="btn" href="#/">Back</a>
        <h1>Settings</h1>
      </header>

      <h2>Backup</h2>
      <p class={overdue ? 'error' : 'muted'}>Last backup: {ago(daysSince(lastBackup, now))}</p>
      <p class={fullDue ? 'error' : 'muted'}>Last full backup: {ago(daysSince(lastFull, now))}</p>
      {changes !== null && <p class="muted">{changes} change{changes === 1 ? '' : 's'} since the last backup</p>}
      <div class="row">
        <button class={fullDue ? '' : 'primary'} disabled={!lastFull || changes === 0}
          onClick={() => runBackup('incremental')}>Back up changes</button>
        <button class={fullDue ? 'primary' : ''} onClick={() => runBackup('full')}>Full backup</button>
      </div>
      <p class="muted">
        Your collection lives only on this phone; removing the app from the home screen deletes it.
        Save backups to Google Drive. To restore, import the latest full backup together with every "changes" backup made after it (any order).
      </p>
      <label class="btn" style="margin:0;color:var(--text);font-size:16px">
        Import backup files
        <input type="file" accept=".zip,application/zip" multiple hidden onChange={onImportFiles} />
      </label>
      {pending && <ImportPreview plan={pending.plan} files={pending.files} onApply={apply} onCancel={() => setPending(null)} />}

      <h2>Storage</h2>
      <p class={persisted === false ? 'error' : 'muted'}>
        {persisted === true ? 'Persistent: the browser will not clear it on its own.'
          : persisted === false ? 'Not persistent: the browser may clear it when the phone is low on space. Keep backups current.'
            : 'Persistence unknown on this browser.'}
      </p>
    </>
  )
}
