import { useState } from 'preact/hooks'

const KEY = 'install-gate-dismissed'

export function isStandalone() {
  return navigator.standalone === true || window.matchMedia?.('(display-mode: standalone)').matches === true
}

const isAndroid = () => /android/i.test(navigator.userAgent)

function wasDismissed() {
  try {
    return sessionStorage.getItem(KEY) === '1'
  } catch {
    return false
  }
}

export default function InstallGate({ children }) {
  const [open, setOpen] = useState(() => !isStandalone() && !wasDismissed())
  if (!open) return children
  const dismiss = () => {
    try {
      sessionStorage.setItem(KEY, '1')
    } catch {
      // private mode: dismiss for this render only
    }
    setOpen(false)
  }
  return (
    <div class="gate">
      <h1>Add to Home Screen</h1>
      <p>The Chopping Block keeps your collection on this phone. Install it first so it opens like an app and keeps its data:</p>
      {isAndroid()
        ? (
          <ol>
            <li>Tap the Chrome menu (⋮, top right).</li>
            <li>Choose <b>Add to Home screen</b> or <b>Install app</b>.</li>
            <li>Open The Chopping Block from your home screen.</li>
          </ol>
        )
        : (
          <ol>
            <li>Tap the Share button (square with an arrow).</li>
            <li>Choose <b>Add to Home Screen</b>.</li>
            <li>Open The Chopping Block from your home screen.</li>
          </ol>
        )}
      <button onClick={dismiss}>Use in browser anyway</button>
    </div>
  )
}
