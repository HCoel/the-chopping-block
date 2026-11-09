import { useEffect, useState } from 'preact/hooks'
import { repo } from '../store.js'
import { jpegSize, shouldTurn } from '../core/thumbs.js'
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

// A 4:3 frame holding the photo, turned when shouldTurn says so
function Framed({ record, slot, cls, alt, onClick }) {
  const url = useBlobUrl(record)
  if (!url) return <div class={`${cls} placeholder`} />
  const turned = shouldTurn(slot, jpegSize(record.data))
  return (
    <div class={`${cls} frame`} onClick={onClick}>
      <img class={turned ? 'turned' : ''} src={url} alt={alt} />
    </div>
  )
}

export default function PhotoView({ id, slot, alt = '', class: cls = 'photo', onClick }) {
  const photo = useLive(() => repo.getPhoto(id), [id], null)
  return <Framed record={photo} slot={slot} cls={cls} alt={alt} onClick={onClick} />
}

export function ThumbView({ id, slot, alt = '' }) {
  const thumb = useLive(() => repo.getThumb(id), [id], null)
  return <Framed record={thumb} slot={slot} cls="thumb" alt={alt} />
}

// A just-picked photo not saved yet
export function PendingThumbView({ thumb, slot }) {
  return <Framed record={thumb} slot={slot} cls="thumb" alt="" />
}

// Full screen: the original orientation, which suits a portrait phone screen
export function PlainPhoto({ id, alt = '', class: cls, onClick }) {
  const photo = useLive(() => repo.getPhoto(id), [id], null)
  const url = useBlobUrl(photo)
  return url ? <img class={cls} src={url} alt={alt} onClick={onClick} /> : null
}
