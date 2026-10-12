import { useEffect, useState } from 'preact/hooks'
import { SLOTS } from '../core/db.js'
import { processPhoto } from '../core/image.js'
import { guard } from './toast.jsx'
import { ThumbView } from './PhotoView.jsx'

export const SLOT_LABELS = { profile: 'Profile', stamp: 'Stamp', extra: 'Extra' }

function PendingThumb({ thumb }) {
  const [url, setUrl] = useState(null)
  useEffect(() => {
    const u = URL.createObjectURL(new Blob([thumb.data], { type: thumb.type }))
    setUrl(u)
    return () => URL.revokeObjectURL(u)
  }, [thumb])
  return url ? <img class="thumb" src={url} alt="" /> : null
}

// existing: { [slot]: photoId } already saved. changes: { [slot]: undefined | null | { full, thumb } }.
// Photos are processed on pick and only written when the form is saved, so cancelling leaves nothing behind.
export default function PhotoSlots({ existing, changes, onChange }) {
  const [busy, setBusy] = useState(null)

  async function pick(slot, e) {
    const file = e.currentTarget.files?.[0]
    e.currentTarget.value = ''
    if (!file) return
    setBusy(slot)
    const processed = await guard(() => processPhoto(file, slot), "Couldn't read that photo")
    setBusy(null)
    if (processed) onChange({ [slot]: processed })
  }

  return (
    <div class="slots">
      {SLOTS.map(slot => {
        const change = changes[slot]
        const hasPhoto = change ? true : change === null ? false : Boolean(existing[slot])
        const label = SLOT_LABELS[slot]
        return (
          <div class="slot" key={slot}>
            <label class="slot-pick">
              {busy === slot
                ? <div class="thumb placeholder">…</div>
                : change
                  ? <PendingThumb thumb={change.thumb} />
                  : hasPhoto
                    ? <ThumbView id={existing[slot]} />
                    : <div class="thumb placeholder">＋</div>}
              <span>{label}{slot === 'stamp' ? ' ★' : ''}</span>
              <input type="file" accept="image/*" hidden aria-label={`${label} photo`} onChange={e => pick(slot, e)} />
            </label>
            {hasPhoto && <button type="button" class="slot-remove" aria-label={`Remove ${label.toLowerCase()} photo`} onClick={() => onChange({ [slot]: null })}>×</button>}
          </div>
        )
      })}
    </div>
  )
}
