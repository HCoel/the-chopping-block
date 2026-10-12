import { formatWeight } from '../../core/weight.js'
import {
  BIT_TYPES, COLLECTION, CONDITION_KEYS, EYE_SHAPES, FORGING, GRADES, HAFTS, KNOWN_MAKERS, LEGIBILITY, PATTERNS, POLLS, RESTORATION,
} from './definition.js'

const num = v => (v === '' || v == null ? null : Number(v))

// Short option lists as chips: one tap on a phone, tap again to clear
function Choice({ label, value, options, onChange, allowClear = true }) {
  return (
    <div>
      <label>{label}</label>
      <div class="chips" role="group" aria-label={label}>
        {options.map(o => (
          <button type="button" key={o} aria-pressed={value === o} onClick={() => onChange(value === o && allowClear ? null : o)}>{o}</button>
        ))}
      </div>
    </div>
  )
}

function Section({ title, open = false, children }) {
  return (
    <details class="section" open={open}>
      <summary>{title}</summary>
      {children}
    </details>
  )
}

export default function FormFields({ fields, errors, onFields, makers = [] }) {
  const f = fields
  const set = key => v => onFields({ [key]: v })
  const text = key => e => onFields({ [key]: e.currentTarget.value })
  const number = key => e => onFields({ [key]: num(e.currentTarget.value) })
  const err = key => errors[key] && <div class="error">{errors[key]}</div>
  const numField = (key, label) => (
    <div>
      <label for={key}>{label}</label>
      <input id={key} type="number" inputmode="decimal" value={f[key] ?? ''} onInput={number(key)} />
      {err(key)}
    </div>
  )
  const makerOptions = [...new Set([...makers, ...KNOWN_MAKERS])].sort((a, b) => a.localeCompare(b))

  return (
    <>
      <Section title="Identity" open>
        <label for="maker">Maker</label>
        <input id="maker" list="makers" value={f.maker} autocomplete="off" onInput={text('maker')} />
        <datalist id="makers">{makerOptions.map(m => <option key={m} value={m} />)}</datalist>
        {err('maker')}
        <label for="pattern">Pattern</label>
        <select id="pattern" value={f.pattern} onChange={text('pattern')}>
          <option value="">-</option>
          {PATTERNS.map(p => <option key={p} value={p}>{p}</option>)}
        </select>
        <label for="stamp_text">Stamp / markings</label>
        <input id="stamp_text" value={f.stamp_text} onInput={text('stamp_text')} />
        <Choice label="Stamp legibility" value={f.stamp_legibility} options={LEGIBILITY} onChange={set('stamp_legibility')} />
        <Choice label="Bit type" value={f.bit_type} options={BIT_TYPES} onChange={set('bit_type')} allowClear={false} />
        <div class="row">
          <div><label for="country">Country</label><input id="country" value={f.country} onInput={text('country')} /></div>
          <div><label for="era">Era</label><input id="era" value={f.era} placeholder="e.g. 1930s-50s" onInput={text('era')} /></div>
        </div>
      </Section>

      <Section title="Measurements" open>
        {numField('weight_g', 'Head weight (g)')}
        {f.weight_g != null && !errors.weight_g && <div class="muted">{formatWeight(f.weight_g)}</div>}
        <div class="row">
          {numField('bit_length_mm', 'Bit length (mm)')}
          {numField('head_length_mm', 'Head length (mm)')}
        </div>
        <Choice label="Eye shape" value={f.eye_shape} options={EYE_SHAPES} onChange={set('eye_shape')} />
        <Choice label="Poll" value={f.poll} options={POLLS} onChange={set('poll')} />
        <Choice label="Forging" value={f.forging} options={FORGING} onChange={set('forging')} />
      </Section>

      <Section title="Condition">
        {Object.entries(CONDITION_KEYS).map(([key, label]) => (
          <Choice key={key} label={label} value={f[key]} options={GRADES} onChange={set(key)} />
        ))}
        <Choice label="Restoration" value={f.restoration} options={RESTORATION} onChange={set('restoration')} allowClear={false} />
      </Section>

      <Section title="Haft">
        <Choice label="Haft" value={f.haft} options={HAFTS} onChange={set('haft')} allowClear={false} />
        {f.haft !== 'none' && (
          <div class="row">
            <div><label for="haft_wood">Wood</label><input id="haft_wood" value={f.haft_wood} onInput={text('haft_wood')} /></div>
            {numField('haft_length_mm', 'Length (mm)')}
          </div>
        )}
      </Section>

      <Section title="Provenance and value">
        <label for="found_where">Found where / from whom</label>
        <input id="found_where" value={f.found_where} onInput={text('found_where')} />
        <label for="acquired_date">Acquired</label>
        <input id="acquired_date" type="date" value={f.acquired_date} onInput={text('acquired_date')} />
        {err('acquired_date')}
        <div class="row">
          {numField('price_paid', 'Price paid')}
          {numField('est_value', 'Est. value')}
        </div>
        <label for="location">Storage location</label>
        <input id="location" value={f.location} onInput={text('location')} />
        <Choice label="Status" value={f.collection_status} options={COLLECTION} onChange={set('collection_status')} allowClear={false} />
      </Section>
    </>
  )
}
