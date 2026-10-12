import { checkRange } from '../../core/validate.js'
import { formatLbOz } from '../../core/weight.js'

export const PATTERNS = [
  'Dayton', 'Michigan', 'Jersey', 'Kentucky', 'Hudson Bay', 'Connecticut', 'Double bit', 'Broad / hewing',
  'Hatchet', "Boy's axe", 'Felling', 'Splitting', 'Maul', 'Carpenter', 'Pulaski', 'Tomahawk', 'Adze', 'Other',
]
export const LEGIBILITY = ['full', 'partial', 'ghost', 'none']
export const BIT_TYPES = ['single', 'double']
export const EYE_SHAPES = ['teardrop', 'oval', 'round', 'other']
export const POLLS = ['flat', 'hammer', 'none']
export const FORGING = ['drop', 'hand', 'cast', 'unknown']
export const GRADES = ['good', 'fair', 'poor']
export const RESTORATION = ['as found', 'cleaned', 'restored', 'hung']
export const HAFTS = ['none', 'original', 'replacement']
export const COLLECTION = ['owned', 'for trade', 'sold', 'wishlist']

// Suggestions only: the maker field is free text
export const KNOWN_MAKERS = [
  'Plumb', 'Kelly', 'True Temper', 'Collins', 'Mann Edge Tool', 'Warren', 'Council Tool', 'Snow & Nealley',
  'Sager', 'Emerson & Stevens', 'Hults Bruk', 'Gränsfors Bruk', 'Wetterlings', 'Fiskars', 'Hytest', 'Elwell',
  'Gilpin', 'Brades', 'Spear & Jackson',
]

export const CONDITION_KEYS = { cond_stamp: 'Stamp', cond_bit: 'Bit', cond_poll: 'Poll', cond_surface: 'Surface' }

export function newFields() {
  return {
    maker: '', stamp_text: '', stamp_legibility: null, pattern: '', bit_type: 'single', country: '', era: '',
    weight_g: null, bit_length_mm: null, head_length_mm: null, eye_shape: null, poll: null,
    forging: null,
    cond_stamp: null, cond_bit: null, cond_poll: null, cond_surface: null, restoration: 'as found',
    haft: 'none', haft_wood: '', haft_length_mm: null,
    found_where: '', acquired_date: '', price_paid: null, est_value: null, location: '',
    collection_status: 'owned',
  }
}

export function defaultName(product) {
  const f = product.fields
  return [f.maker, f.pattern].map(v => (v ?? '').trim()).filter(Boolean).join(' ') || 'Unnamed axe'
}

// A stored name equal to the derived one was auto-generated: edit it as blank so it keeps tracking changes
export function editableName(product) {
  return product.name === defaultName(product) ? '' : product.name
}

const todayLocal = () => new Date(Date.now() - new Date().getTimezoneOffset() * 60_000).toISOString().slice(0, 10)

export function validate(product, today = todayLocal()) {
  const f = product.fields
  const e = {}
  if (!(f.maker ?? '').trim() && !(f.pattern ?? '').trim()) e.maker = 'Add a maker or a pattern'
  checkRange(e, 'weight_g', f.weight_g, 50, 10000)
  checkRange(e, 'bit_length_mm', f.bit_length_mm, 10, 600)
  checkRange(e, 'head_length_mm', f.head_length_mm, 10, 600)
  checkRange(e, 'haft_length_mm', f.haft_length_mm, 50, 2000)
  checkRange(e, 'price_paid', f.price_paid, 0, 1_000_000)
  checkRange(e, 'est_value', f.est_value, 0, 1_000_000)
  if (f.acquired_date && f.acquired_date > today) e.acquired_date = "Can't be in the future"
  return e
}

const unique = values => [...new Set(values.filter(Boolean))].sort((a, b) => a.localeCompare(b))

export const facets = [
  { key: 'pattern', label: 'Pattern', options: products => unique(products.map(p => p.fields.pattern)), get: p => p.fields.pattern },
  { key: 'maker', label: 'Maker', options: products => unique(products.map(p => p.fields.maker?.trim())), get: p => p.fields.maker?.trim() },
  { key: 'collection_status', label: 'Status', options: COLLECTION, get: p => p.fields.collection_status },
  { key: 'restoration', label: 'Restoration', options: RESTORATION, get: p => p.fields.restoration },
]

const last = Number.POSITIVE_INFINITY
export const sorts = [
  { key: 'maker', label: 'Maker', get: p => (p.fields.maker ?? '').trim().toLowerCase() },
  { key: 'weight', label: 'Heaviest', get: p => (p.fields.weight_g == null ? last : -p.fields.weight_g) },
  { key: 'acquired', label: 'Newest acquired', get: p => (p.fields.acquired_date ? -Date.parse(p.fields.acquired_date) : last) },
  { key: 'pattern', label: 'Pattern', get: p => (PATTERNS.includes(p.fields.pattern) ? PATTERNS.indexOf(p.fields.pattern) : last) },
]

export function summary(product) {
  const f = product.fields
  // The name already carries maker and pattern
  return [f.weight_g != null && formatLbOz(f.weight_g), f.restoration].filter(Boolean).join(' · ')
}
