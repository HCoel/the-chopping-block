import { facetOptions } from '../core/query.js'

export default function Filters({ lib, products, value, onChange }) {
  const set = patch => onChange({ ...value, ...patch })
  const toggle = (key, option) => {
    const current = value.filters[key] ?? []
    const next = current.includes(option) ? current.filter(o => o !== option) : [...current, option]
    set({ filters: { ...value.filters, [key]: next } })
  }
  const active = Object.values(value.filters).reduce((n, list) => n + list.length, 0)
  // Folded by default: four rows of chips would push the collection below the fold on a phone
  return (
    <div>
      <div class="row">
        <input type="search" placeholder="Search maker, stamp, notes..." aria-label="Search" value={value.search}
          onInput={e => set({ search: e.currentTarget.value })} style="flex:2" />
        <select aria-label="Sort" value={value.sort} onChange={e => set({ sort: e.currentTarget.value })}>
          <option value="name">Name</option>
          {(lib.sorts ?? []).map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
        </select>
      </div>
      <details class="filters">
        <summary>Filters{active > 0 && ` (${active})`}</summary>
        {lib.facets.map(f => {
          const options = facetOptions(f, products)
          if (options.length < 2) return null
          return (
            <div class="chips" role="group" aria-label={f.label} key={f.key}>
              {options.map(o => (
                <button type="button" key={o} aria-pressed={(value.filters[f.key] ?? []).includes(o)} onClick={() => toggle(f.key, o)}>{o}</button>
              ))}
            </div>
          )
        })}
        {active > 0 && <button type="button" onClick={() => set({ filters: {} })}>Clear filters</button>}
      </details>
    </div>
  )
}
