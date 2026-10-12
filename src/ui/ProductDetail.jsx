import { useState } from 'preact/hooks'
import { repo } from '../store.js'
import { getLibrary } from '../libraries/index.js'
import { guard } from './toast.jsx'
import { navigate } from './router.js'
import { useLive } from './useLive.js'
import PhotoView from './PhotoView.jsx'
import { SLOT_LABELS } from './PhotoSlots.jsx'

// Full screen; tap toggles between fit and 2.5x, where the photo pans by scrolling (for faint stamps)
function Viewer({ id, label, onClose }) {
  const [zoomed, setZoomed] = useState(false)
  return (
    <div class="viewer" role="dialog" aria-label={`${label} photo`}>
      <button class="viewer-close" onClick={onClose}>Close</button>
      <div class={`viewer-scroll${zoomed ? ' zoomed' : ''}`}>
        <PhotoView id={id} class="viewer-img" alt={label} onClick={() => setZoomed(!zoomed)} />
      </div>
      <p class="muted viewer-hint">Tap to {zoomed ? 'fit' : 'zoom'}</p>
    </div>
  )
}

export default function ProductDetail({ id }) {
  const product = useLive(() => repo.getProduct(id), [id], null)
  const thumbs = useLive(() => repo.listThumbs(id), [id], [])
  const [open, setOpen] = useState(null)

  if (product === null) return null
  if (!product) return <><header class="bar"><a class="btn" href="#/">Back</a></header><p>Axe not found.</p></>

  const lib = getLibrary(product.library)
  const DetailInfo = lib.DetailInfo
  const opened = thumbs.find(t => t.id === open)

  async function remove() {
    if (!confirm(`Delete ${product.name}? This also removes its photos.`)) return
    const ok = await guard(async () => { await repo.deleteProduct(id); return true })
    if (ok) navigate('/')
  }

  return (
    <>
      <header class="bar">
        <a class="btn" href="#/">Back</a>
        <h1>{product.name}</h1>
      </header>
      {thumbs.length > 0 && (
        <div class="carousel">
          {thumbs.map(t => (
            <figure key={t.id}>
              <PhotoView id={t.id} alt={`${SLOT_LABELS[t.slot]} photo`} onClick={() => setOpen(t.id)} />
              <figcaption class="muted">{SLOT_LABELS[t.slot]}</figcaption>
            </figure>
          ))}
        </div>
      )}
      <DetailInfo product={product} />
      {product.notes && <><h3>Notes</h3><p class="notes">{product.notes}</p></>}
      <div class="row">
        <a class="btn" href={`#/edit/${id}`}>Edit</a>
        <a class="btn" href={`#/new/${id}`}>Duplicate</a>
        <button class="danger" onClick={remove}>Delete</button>
      </div>
      {opened && <Viewer id={opened.id} label={SLOT_LABELS[opened.slot]} onClose={() => setOpen(null)} />}
    </>
  )
}
