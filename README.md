# The Chopping Block

Personal axe head collection catalogue. An offline phone web app (PWA): your collection stays on your phone.

Live app: https://hcoel.github.io/the-chopping-block/

## Install

**Android (Chrome)**
1. Open the link in Chrome.
2. Tap the menu (⋮), then **Add to Home screen** or **Install app**.
3. Open The Chopping Block from the home screen (not the Chrome tab: they keep separate data).

**iPhone (Safari)**
1. Open the link in Safari.
2. Tap Share, then **Add to Home Screen**.
3. Open it from the home screen.

## Photos

Each axe has three photo slots: **Profile** (the cover), **Stamp** (kept at higher resolution so you can zoom into faint stamps) and **Extra** (bit, poll, eye, or an after-restoration shot). Tap a photo on the detail page to view it full screen; tap again to zoom.

## Backups

Removing the app from the home screen deletes its data. Back up to Google Drive (Android) or iCloud Drive (iPhone) through the share sheet.

- **Full backup**: everything. Do one first, then at least every 60 days.
- **Back up changes**: only what changed since the last backup. Small and quick; do it after each session of adding axes.
- A banner appears after 14 days without a backup.
- **Restore**: Settings > Import backup files, select the latest full backup and every "incr" backup made after it, in one go or one at a time. Order doesn't matter: the newest copy of each record wins.

## Develop

    npm install
    npm run dev        # http://localhost:5173/the-chopping-block/
    npm test           # unit tests (Vitest)
    npm run e2e        # smoke test (Playwright: iPhone WebKit + Pixel Chromium)

Pushing to `main` runs the tests and deploys to GitHub Pages when they pass.

## Manual device checklist (run after notable changes)

Android (Chrome) is the main device; repeat the starred items on iPhone (Safari).

- [ ] ★ Install to home screen; launches full screen without browser chrome
- [ ] ★ Airplane mode: app opens and data shows
- [ ] ★ Add an axe with camera photos in all three slots; stamp photo zooms full screen
- [ ] Settings shows "Storage: Persistent"
- [ ] ★ Full backup via share sheet to Google Drive / iCloud Drive; banner clears
- [ ] Edit an axe, "Back up changes": file is small and named `...-incr-...`
- [ ] Cancelling the share sheet does not count as a backup
- [ ] Restore full + incr backups on a second browser/profile: everything returns, photos included
- [ ] ★ Push a change: "Update available - Reload" appears on next launch
- [ ] ★ Scroll a long screen: header stays below the status bar / camera cutout
- [ ] Load test: 150 axes x 3 photos; grid scrolls smoothly and a full backup completes on the phone
