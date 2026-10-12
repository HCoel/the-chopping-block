import { useEffect, useState } from 'preact/hooks'
import { repo } from '../store.js'
import { getLibrary } from '../libraries/index.js'
import { guard } from './toast.jsx'
import { navigate } from './router.js'
import { useLive } from './useLive.js'
import PhotoSlots from './PhotoSlots.jsx'

function blankState(lib) {
  return { libId: lib.id, name: '', notes: '', fields: lib.newFields(), existing: {}, changes: {} }
}

// Duplicates copy fields only: photos belong to one physical head
function fromProduct(p, isEdit, thumbs) {
  const lib = getLibrary(p.library)
  return {
    libId: p.library,
    name: isEdit ? lib.editableName(p) : '',
    notes: p.notes ?? '',
    fields: { ...lib.newFields(), ...p.fields },
    existing: isEdit ? Object.fromEntries(thumbs.map(t => [t.slot, t.id])) : {},
    changes: {},
  }
}

function buildProduct(lib, s, id) {
  const p = { library: lib.id, notes: s.notes, fields: { ...s.fields, maker: s.fields.maker.trim() } }
  if (id) p.id = id
  return { ...p, name: s.name.trim() || lib.defaultName(p) }
}

export default function ProductForm({ lib: defaultLib, editId, duplicateFrom }) {
  const sourceId = editId ?? duplicateFrom
  const [state, setState] = useState(sourceId ? null : blankState(defaultLib))
  const [missing, setMissing] = useState(false)
  const libId = state?.libId ?? defaultLib.id
  const products = useLive(() => repo.listProducts(libId), [libId], [])

  // The form is keyed by route, so a new form starts blank from useState; resetting here would
  // wipe anything typed before the effect ran
  useEffect(() => {
    if (!sourceId) return
    Promise.all([repo.getProduct(sourceId), repo.listThumbs(sourceId)])
      .then(([p, thumbs]) => (p ? setState(fromProduct(p, Boolean(editId), thumbs)) : setMissing(true)))
  }, [sourceId])

  if (missing) return <><header class="bar"><a class="btn" href="#/">Back</a></header><p>Axe not found.</p></>
  if (!state) return null

  const lib = getLibrary(state.libId)
  const candidate = buildProduct(lib, state, editId)
  const errors = lib.validate(candidate)
  const valid = Object.keys(errors).length === 0
  const update = patch => setState(s => ({ ...s, ...patch }))
  const makers = [...new Set(products.map(p => p.fields.maker?.trim()).filter(Boolean))]
  const FormFields = lib.FormFields

  async function save(e) {
    e.preventDefault()
    if (!valid) return
    const saved = await guard(() => repo.saveProduct(candidate, state.changes))
    if (saved) navigate(`/p/${saved.id}`)
  }

  const title = editId ? 'Edit' : duplicateFrom ? 'Duplicate' : 'New axe'

  return (
    <form onSubmit={save}>
      <header class="bar">
        <a class="btn" href={editId ? `#/p/${editId}` : '#/'}>Cancel</a>
        <h1>{title}</h1>
        <button class="primary" type="submit" disabled={!valid}>Save</button>
      </header>
      <PhotoSlots existing={state.existing} changes={state.changes}
        onChange={c => setState(s => ({ ...s, changes: { ...s.changes, ...c } }))} />
      <FormFields
        fields={state.fields}
        errors={errors}
        makers={makers}
        onFields={p => setState(s => ({ ...s, fields: { ...s.fields, ...p } }))}
      />
      <label for="name">Name</label>
      <input id="name" value={state.name} placeholder={lib.defaultName(candidate)} onInput={e => update({ name: e.currentTarget.value })} />
      <label for="notes">Notes</label>
      <textarea id="notes" rows="3" value={state.notes} onInput={e => update({ notes: e.currentTarget.value })} />
    </form>
  )
}
