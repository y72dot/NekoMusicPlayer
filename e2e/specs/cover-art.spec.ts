import { test, expect } from '@playwright/test'
import { LibraryPage } from '../pages/LibraryPage'
import { audioMockScript, seedTracks } from '../fixtures/test-helpers'

test.beforeEach(async ({ page }) => {
  await page.addInitScript(audioMockScript)
})

test.describe('Cover Art', () => {
  let library: LibraryPage

  test.beforeEach(async ({ page }) => {
    await seedTracks(page, 2)
    library = new LibraryPage(page)
  })

  test('CV-01: each track has a cover wrapper', async () => {
    const rows = library.trackRows
    const count = await rows.count()
    for (let i = 0; i < count; i++) {
      await expect(rows.nth(i).locator('.cover-wrapper')).toBeVisible()
    }
  })

  test('CV-02: placeholder is displayed for tracks without embedded art', async () => {
    const rows = library.trackRows
    if (await rows.count() > 0) {
      // silence.mp3 has no embedded cover, so placeholder should show
      const placeholder = rows.first().locator('.cover-wrapper .placeholder')
      await expect(placeholder).toBeVisible()
    }
  })
})
