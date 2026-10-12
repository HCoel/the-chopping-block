import { formatWeight } from '../../core/weight.js'
import { CONDITION_KEYS } from './definition.js'

const mm = v => (v == null ? null : `${v} mm`)
const money = v => (v == null ? null : `$${v}`)

export default function DetailInfo({ product }) {
  const f = product.fields
  const condition = Object.entries(CONDITION_KEYS)
    .filter(([key]) => f[key])
    .map(([key, label]) => `${label} ${f[key]}`)
    .join(' · ')
  const groups = [
    ['Identity', [
      ['Maker', f.maker],
      ['Pattern', f.pattern],
      ['Stamp', [f.stamp_text, f.stamp_legibility && `(${f.stamp_legibility})`].filter(Boolean).join(' ')],
      ['Bit', f.bit_type],
      ['Country', f.country],
      ['Era', f.era],
    ]],
    ['Measurements', [
      ['Weight', formatWeight(f.weight_g)],
      ['Bit length', mm(f.bit_length_mm)],
      ['Head length', mm(f.head_length_mm)],
      ['Eye', f.eye_shape],
      ['Poll', f.poll],
      ['Forging', f.forging],
    ]],
    ['Condition', [
      ['Grades', condition],
      ['Restoration', f.restoration],
    ]],
    ['Haft', [
      ['Haft', f.haft !== 'none' ? [f.haft, f.haft_wood, mm(f.haft_length_mm)].filter(Boolean).join(' · ') : null],
    ]],
    ['Provenance and value', [
      ['Found', f.found_where],
      ['Acquired', f.acquired_date],
      ['Paid', money(f.price_paid)],
      ['Est. value', money(f.est_value)],
      ['Location', f.location],
      ['Status', f.collection_status],
    ]],
  ]
    .map(([title, rows]) => [title, rows.filter(r => r[1])])
    .filter(([, rows]) => rows.length > 0)

  return groups.map(([title, rows]) => (
    <section key={title}>
      <h3>{title}</h3>
      <table class="settings-table">
        <tbody>{rows.map(([k, v]) => <tr key={k}><td class="muted">{k}</td><td>{v}</td></tr>)}</tbody>
      </table>
    </section>
  ))
}
