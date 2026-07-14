import { test, expect } from '@playwright/test'
import { LibraryPage } from '../pages/LibraryPage'
import { audioMockScript, seedTracks } from '../fixtures/test-helpers'

test.beforeEach(async ({ page }) => {
  await page.addInitScript(audioMockScript)
})

test.describe('Multi-Select & Batch Operations', () => {
  let library: LibraryPage

  test.beforeEach(async ({ page }) => {
    await seedTracks(page, 3)
    library = new LibraryPage(page)
  })

  test('MS-01: clicking toggle button enters multi-select mode', async ({ page }) => {
    // Hover over first row and click more button to expand menu
    await library.trackRows.first().hover()
    await library.moreButtons.first().click()
    // Click the toggle select button
    await library.toggleSelectButtons.first().click()
    // Batch action bar should appear
    await expect(library.batchActionBar).toBeVisible()
  })

  test('MS-02: clicking row in multi-select toggles selection', async () => {
    // Enter multi-select first
    await library.trackRows.first().hover()
    await library.moreButtons.first().click()
    await library.toggleSelectButtons.first().click()

    // Now click another row to toggle selection
    await library.clickTrack(1)
    // Count should show 2
    await expect(library.batchActionBar.locator('.count')).toBeVisible()
  })

  test('MS-03: cancel exits multi-select', async () => {
    // Enter multi-select
    await library.trackRows.first().hover()
    await library.moreButtons.first().click()
    await library.toggleSelectButtons.first().click()

    await library.cancelMultiSelect()
    await expect(library.batchActionBar).not.toBeVisible()
  })

  test('MS-04: Escape exits multi-select', async ({ page }) => {
    // Enter multi-select
    await library.trackRows.first().hover()
    await library.moreButtons.first().click()
    await library.toggleSelectButtons.first().click()

    await page.keyboard.press('Escape')
    await expect(library.batchActionBar).not.toBeVisible()
  })
})
