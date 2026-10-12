import { expect, test } from '@playwright/test'

// Stub the share sheet: canShare says yes, share() behaves as `mode` says
async function stubShare(page, mode) {
  await page.addInitScript(m => {
    window.__shared = 0
    Object.defineProperty(navigator, 'canShare', { value: () => true, configurable: true })
    Object.defineProperty(navigator, 'share', {
      configurable: true,
      value: async () => {
        if (m === 'refuse') throw new DOMException('Permission denied', 'NotAllowedError')
        window.__shared++
      },
    })
  }, mode)
}

async function addAxeAndOpenBackup(page) {
  await page.goto('./')
  await page.getByRole('button', { name: 'Use in browser anyway' }).click()
  await page.getByRole('link', { name: 'Add axe' }).click()
  await page.getByLabel('Maker').fill('Plumb')
  await page.getByRole('button', { name: 'Save' }).click()
  await page.getByRole('link', { name: 'Back' }).click()
  await page.getByRole('button', { name: 'Back up now' }).click()
  return page.getByRole('dialog', { name: 'Backup ready' })
}

test('share succeeds: backup is recorded', async ({ page }) => {
  await stubShare(page, 'ok')
  const sheet = await addAxeAndOpenBackup(page)
  await sheet.getByRole('button', { name: 'Share' }).click()
  await expect(page.getByText('Backup saved')).toBeVisible()
  expect(await page.evaluate(() => window.__shared)).toBe(1)
  await expect(page.getByRole('alert')).toHaveCount(0)
})

// Chrome refuses .zip with NotAllowedError; that must not loop on "Share now"
test('share refused: shows the error, Save to device still works', async ({ page }) => {
  await stubShare(page, 'refuse')
  const sheet = await addAxeAndOpenBackup(page)
  await sheet.getByRole('button', { name: 'Share' }).click()
  await expect(sheet.getByText(/Sharing didn't work \(NotAllowedError: Permission denied\)/)).toBeVisible()
  await expect(page.getByRole('alert')).toBeVisible() // not backed up yet
  const download = page.waitForEvent('download')
  await sheet.getByRole('button', { name: 'Save to device' }).click()
  expect((await download).suggestedFilename()).toMatch(/full.*\.zip$/)
  await expect(page.getByRole('alert')).toHaveCount(0)
})
