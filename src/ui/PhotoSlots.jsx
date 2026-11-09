import { useState } from 'preact/hooks'
import { SLOTS } from '../core/db.js'
import { processPhoto } from '../core/image.js'
import { guard } from './toast.jsx'
import { PendingThumbView, ThumbView } from './PhotoView.jsx'

export const SLOT_LABELS = { profile: 'Profile', stamp: 'Stamp', extra: 'Extra' }

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
    <>
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
                    ? <PendingThumbView thumb={change.thumb} slot={slot} />
                    : hasPhoto
                      ? <ThumbView id={existing[slot]} slot={slot} />
                      : <div class="thumb placeholder">＋</div>}
                <span>{label}{slot === 'stamp' ? ' ★' : ''}</span>
                <input type="file" accept="image/*" hidden aria-label={`${label} photo`} onChange={e => pick(slot, e)} />
              </label>
              {hasPhoto && <button type="button" class="slot-remove" aria-label={`Remove ${label.toLowerCase()} photo`} onClick={() => onChange({ [slot]: null })}>×</button>}
            </div>
          )
        })}
      </div>
      <p class="muted slots-tip">Tip: shoot landscape, axe side-on, so it fills the frame.</p>
    </>
  )
}
