// Hand a file to the share sheet (Google Drive on Android, Files on iPhone), or download it where sharing files is unsupported.
// Returns 'shared' | 'cancelled' | 'blocked' | 'downloaded'. Only 'shared' and 'downloaded' mean a file left the app.
export async function deliverFile(file, { nav = navigator, download }) {
  if (nav.canShare?.({ files: [file] })) {
    try {
      await nav.share({ files: [file], title: 'The Chopping Block backup' })
      return 'shared'
    } catch (e) {
      if (e.name === 'AbortError') return 'cancelled'
      // Both browsers need a recent tap; a big backup can take longer than that to build
      if (e.name === 'NotAllowedError') return 'blocked'
    }
  }
  download(file)
  return 'downloaded'
}
