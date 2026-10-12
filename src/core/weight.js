const G_PER_OZ = 28.349523125

// Collectors talk in lb/oz ("a 3.5 lb Dayton"); grams are stored to avoid rounding drift
export function toLbOz(grams) {
  const totalOz = Math.round(grams / G_PER_OZ)
  return { lb: Math.floor(totalOz / 16), oz: totalOz % 16 }
}

export function formatLbOz(grams) {
  const { lb, oz } = toLbOz(grams)
  if (lb === 0) return `${oz} oz`
  return oz === 0 ? `${lb} lb` : `${lb} lb ${oz} oz`
}

export function formatWeight(grams) {
  if (grams == null) return null
  const metric = grams >= 1000 ? `${(grams / 1000).toFixed(2)} kg` : `${grams} g`
  return `${metric} · ${formatLbOz(grams)}`
}
