export function matchesSearch(product, search) {
  const q = (search ?? '').trim().toLowerCase()
  if (!q) return true
  const f = product.fields ?? {}
  return [product.name, product.notes, f.maker, f.stamp_text, f.pattern, f.country, f.era, f.location, f.found_where]
    .some(v => (v ?? '').toLowerCase().includes(q))
}

export function matchesFilters(product, lib, filters) {
  return lib.facets.every(f => {
    const selected = filters?.[f.key] ?? []
    return selected.length === 0 || selected.includes(f.get(product))
  })
}

const byName = (a, b) => a.name.localeCompare(b.name)

// Numbers ascending; strings A-Z with blanks last
function compareValues(a, b) {
  if (typeof a === 'number' && typeof b === 'number') return a - b
  if (a === b) return 0
  if (a === '') return 1
  if (b === '') return -1
  return String(a).localeCompare(String(b))
}

function comparatorFor(lib, sort) {
  const s = lib.sorts?.find(x => x.key === sort)
  if (!s) return byName
  return (a, b) => compareValues(s.get(a), s.get(b)) || byName(a, b)
}

export function queryProducts(products, lib, { search = '', filters = {}, sort = 'name' } = {}) {
  return products
    .filter(p => !p.deleted && matchesSearch(p, search) && matchesFilters(p, lib, filters))
    .sort(comparatorFor(lib, sort))
}

// Facet options may be fixed or derived from the data (e.g. makers actually in the collection)
export function facetOptions(facet, products) {
  return typeof facet.options === 'function' ? facet.options(products) : facet.options
}
