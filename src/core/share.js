export function canShareFile(file, nav = navigator) {
  try {
    return nav.canShare?.({ files: [file] }) === true
  } catch {
    return false
  }
}

// Call straight from a tap handler, with no awaits before it: share() needs a fresh user gesture.
// Returns { result: 'shared' | 'cancelled' | 'failed', error }. Only 'shared' means the file left the app.
// NotAllowedError is not retried: browsers also use it for blocked file types (Chrome blocks .zip),
// so a retry loop would never end.
export async function shareFile(file, nav = navigator) {
  try {
    await nav.share({ files: [file], title: 'The Chopping Block backup' })
    return { result: 'shared' }
  } catch (e) {
    if (e?.name === 'AbortError') return { result: 'cancelled' }
    return { result: 'failed', error: `${e?.name ?? 'Error'}: ${e?.message ?? e}` }
  }
}
