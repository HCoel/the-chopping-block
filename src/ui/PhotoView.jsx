import { useEffect, useState } from 'preact/hooks'
import { repo } from '../store.js'
import { useLive } from './useLive.js'

export function useBlobUrl(record) {
  const [url, setUrl] = useState(null)
  useEffect(() => {
    if (!record?.data) {
      setUrl(null)
      return undefined
    }
    const u = URL.createObjectURL(new Blob([record.data], { type: record.type }))
    setUrl(u)
    return () => URL.revokeObjectURL(u)
  }, [record])
  return url
}

export default function PhotoView({ id, alt = '', class: cls = 'photo', onClick }) {
  const photo = useLive(() => repo.getPhoto(id), [id], null)
  const url = useBlobUrl(photo)
  return url ? <img class={cls} src={url} alt={alt} onClick={onClick} /> : <div class={`${cls} placeholder`} />
}

export function ThumbView({ id, alt = '' }) {
  const thumb = useLive(() => repo.getThumb(id), [id], null)
  const url = useBlobUrl(thumb)
  return url ? <img class="thumb" src={url} alt={alt} /> : <div class="thumb placeholder" />
}
