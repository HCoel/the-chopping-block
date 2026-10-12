import { useState } from 'preact/hooks'
import { repo } from '../store.js'
import { queryProducts } from '../core/query.js'
import { needsBackup } from '../core/reminder.js'
import { useLive } from './useLive.js'
import Filters from './Filters.jsx'
import ProductCard from './ProductCard.jsx'
import BackupBanner from './BackupBanner.jsx'

export default function Grid({ lib }) {
  const products = useLive(() => repo.listProducts(lib.id), [lib.id], [])
  const lastBackup = useLive(() => repo.getMeta('last_backup_at'), [], null)
  const lastFull = useLive(() => repo.getMeta('last_full_backup_at'), [], null)
  const [query, setQuery] = useState({ search: '', filters: {}, sort: 'name' })
  const rows = queryProducts(products, lib, query)
  const remind = needsBackup(lastBackup, products.length, Date.now())
  const noun = lib.label.toLowerCase()

  return (
    <>
      <header class="bar">
        <h1>{lib.label} <span class="muted">{products.length > 0 && products.length}</span></h1>
        <a class="btn icon-btn" href="#/settings" aria-label="Settings">⚙{remind && <span class="badge" />}</a>
        <a class="btn primary" href="#/new" aria-label="Add axe">＋</a>
      </header>
      {remind && <BackupBanner lastBackup={lastBackup} lastFull={lastFull} />}
      <Filters lib={lib} products={products} value={query} onChange={setQuery} />
      {products.length === 0
        ? <p class="muted">No {noun} yet. Tap ＋ to add one.</p>
        : rows.length === 0
          ? <p class="muted">Nothing matches.</p>
          : <div class="grid">{rows.map(p => <ProductCard key={p.id} lib={lib} product={p} />)}</div>}
    </>
  )
}
