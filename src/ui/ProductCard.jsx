import { repo } from '../store.js'
import { useLive } from './useLive.js'
import { ThumbView } from './PhotoView.jsx'
import AxeSilhouette from './AxeSilhouette.jsx'

export default function ProductCard({ lib, product }) {
  const thumbs = useLive(() => repo.listThumbs(product.id), [product.id], [])
  const cover = thumbs[0]
  const faded = ['sold', 'wishlist'].includes(product.fields.collection_status)
  return (
    <a class={`tile${faded ? ' dim' : ''}`} href={`#/p/${product.id}`} aria-label={product.name}>
      {cover ? <ThumbView id={cover.id} alt="" /> : <AxeSilhouette />}
      <strong>{product.name}</strong>
      <span class="muted">{lib.summary(product)}</span>
    </a>
  )
}
