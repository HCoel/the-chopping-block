import { expect, test } from '@playwright/test'

// Force the download fallback; a share sheet cannot be driven headlessly
const noShare = () => {
  Object.defineProperty(navigator, 'canShare', { value: undefined, configurable: true })
  Object.defineProperty(navigator, 'share', { value: undefined, configurable: true })
}

test.beforeEach(async ({ page }) => {
  await page.addInitScript(noShare)
})

// A real JPEG made by the browser, so the app's decode/resize path runs for real
async function makeJpeg(page, color) {
  const b64 = await page.evaluate(c => {
    const canvas = Object.assign(document.createElement('canvas'), { width: 800, height: 600 })
    const ctx = canvas.getContext('2d')
    ctx.fillStyle = c
    ctx.fillRect(0, 0, 800, 600)
    return canvas.toDataURL('image/jpeg').split(',')[1]
  }, color)
  return { name: `${color.slice(1)}.jpg`, mimeType: 'image/jpeg', buffer: Buffer.from(b64, 'base64') }
}

async function openApp(page) {
  await page.goto('./')
  await expect(page.getByRole('heading', { name: 'Add to Home Screen' })).toBeVisible()
  await page.getByRole('button', { name: 'Use in browser anyway' }).click()
}

test('add with photos, filter, back up, restore into a fresh browser', async ({ page, browser }, testInfo) => {
  await openApp(page)
  await expect(page.getByText('No axes yet')).toBeVisible()

  // Add an axe with all three photo slots
  await page.getByRole('link', { name: 'Add axe' }).click()
  await expect(page.getByRole('button', { name: 'Save' })).toBeDisabled()
  await page.getByLabel('Profile photo').setInputFiles(await makeJpeg(page, '#aa5533'))
  await page.getByLabel('Stamp photo').setInputFiles(await makeJpeg(page, '#3355aa'))
  await page.getByLabel('Extra photo').setInputFiles(await makeJpeg(page, '#33aa55'))
  await expect(page.getByRole('button', { name: 'Remove extra photo' })).toBeVisible()
  await page.getByLabel('Maker').fill('Plumb')
  await page.getByLabel('Pattern').selectOption('Dayton')
  await page.getByLabel('Head weight (g)').fill('1588')
  await expect(page.getByText('1.59 kg · 3 lb 8 oz')).toBeVisible()
  await page.getByRole('group', { name: 'Stamp legibility' }).getByRole('button', { name: 'partial' }).click()
  await page.getByRole('button', { name: 'Save' }).click()

  // Detail: name, spec, three photos, stamp opens full screen
  await expect(page.getByRole('heading', { name: 'Plumb Dayton' })).toBeVisible()
  await expect(page.getByText('(partial)')).toBeVisible()
  await expect(page.locator('.carousel img')).toHaveCount(3)
  await page.getByAltText('Stamp photo').click()
  await expect(page.getByRole('dialog', { name: 'Stamp photo' })).toBeVisible()
  await page.getByRole('button', { name: 'Close' }).click()

  // Edit: remove one photo
  await page.getByRole('link', { name: 'Edit' }).click()
  await page.getByRole('button', { name: 'Remove extra photo' }).click()
  await page.getByRole('button', { name: 'Save' }).click()
  await expect(page.locator('.carousel img')).toHaveCount(2)

  // Grid shows a thumbnail; pattern filter
  await page.getByRole('link', { name: 'Back' }).click()
  const tile = page.getByRole('link', { name: 'Plumb Dayton' })
  await expect(tile.locator('img.thumb')).toBeVisible()
  await expect(tile).toContainText('3 lb 8 oz · as found')
  await expect(page.getByRole('alert')).toContainText('Never backed up')
  await page.getByText('Filters').click()
  await page.getByRole('button', { name: 'for trade' }).click()
  await expect(tile).toHaveCount(0)
  await page.getByRole('button', { name: 'for trade' }).click()
  await expect(tile).toBeVisible()

  // Full backup from Settings
  await page.getByRole('link', { name: 'Settings' }).click()
  await expect(page.getByRole('button', { name: 'Back up changes' })).toBeDisabled()
  let download = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Full backup' }).click()
  const full = await download
  expect(full.suggestedFilename()).toMatch(/^the-chopping-block-full-\d{4}-\d{2}-\d{2}-\d{4}\.zip$/)
  await expect(page.getByText('Last full backup: today')).toBeVisible()
  const fullPath = testInfo.outputPath(full.suggestedFilename())
  await full.saveAs(fullPath)

  // A change, then an incremental backup holding only that change
  await page.getByRole('link', { name: 'Back' }).click()
  await expect(page.getByRole('alert')).toHaveCount(0)
  await page.getByRole('link', { name: 'Add axe' }).click()
  await page.getByLabel('Maker').fill('Kelly')
  await page.getByLabel('Pattern').selectOption('Michigan')
  await page.getByRole('button', { name: 'Save' }).click()
  await expect(page.getByRole('heading', { name: 'Kelly Michigan' })).toBeVisible()
  await page.getByRole('link', { name: 'Back' }).click()
  await page.getByRole('link', { name: 'Settings' }).click()
  await expect(page.getByText('1 change since the last backup')).toBeVisible()
  download = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Back up changes' }).click()
  const incr = await download
  expect(incr.suggestedFilename()).toMatch(/^the-chopping-block-incr-.*\.zip$/)
  const incrPath = testInfo.outputPath(incr.suggestedFilename())
  await incr.saveAs(incrPath)

  // Restore both files into an empty browser profile (a new phone)
  const fresh = await browser.newContext({ ...testInfo.project.use })
  const page2 = await fresh.newPage()
  await page2.addInitScript(noShare)
  await openApp(page2)
  await page2.goto('./#/settings')
  await page2.getByLabel('Import backup files').setInputFiles([incrPath, fullPath])
  const preview = page2.getByRole('dialog', { name: 'Import preview' })
  await expect(preview).toContainText('2 files')
  await preview.getByRole('button', { name: 'Apply' }).click()
  await expect(page2.getByText('Backup imported')).toBeVisible()
  await page2.getByRole('link', { name: 'Back' }).click()
  await expect(page2.getByRole('link', { name: 'Kelly Michigan' })).toBeVisible()
  await page2.getByRole('link', { name: 'Plumb Dayton' }).click()
  await expect(page2.locator('.carousel img')).toHaveCount(2)
  await fresh.close()
})
