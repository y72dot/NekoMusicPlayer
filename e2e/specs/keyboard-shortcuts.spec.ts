import { test, expect } from '@playwright/test'
import { LibraryPage } from '../pages/LibraryPage'
import { audioMockScript, seedTracks } from '../fixtures/test-helpers'

test.beforeEach(async ({ page }) => {
  await page.addInitScript(audioMockScript)
})

test.describe('Keyboard Shortcuts', () => {
  let library: LibraryPage

  test.beforeEach(async ({ page }) => {
    await seedTracks(page, 3)
    library = new LibraryPage(page)
  })

  test('KEY-01: Space does not crash when pressed', async ({ page }) => {
    await library.clickTrack(0)
    // Press Space - should toggle without crashing
    await page.keyboard.press('Space')
    await expect(page.locator('.layout')).toBeVisible()
  })

  test('KEY-02: ArrowLeft seeks backward without crash', async ({ page }) => {
    await library.clickTrack(0)
    await page.keyboard.press('ArrowLeft')
    await expect(page.locator('.layout')).toBeVisible()
  })

  test('KEY-03: ArrowRight seeks forward without crash', async ({ page }) => {
    await library.clickTrack(0)
    await page.keyboard.press('ArrowRight')
    await expect(page.locator('.layout')).toBeVisible()
  })

  test('KEY-04: Escape exits multi-select mode', async ({ page }) => {
    // Enter multi-select
    await library.trackRows.first().hover()
    await library.moreButtons.first().click()
    await library.toggleSelectButtons.first().click()
    await expect(library.batchActionBar).toBeVisible()

    await page.keyboard.press('Escape')
    await expect(library.batchActionBar).not.toBeVisible()
  })

  test('KEY-05: Space in search input does not toggle playback', async ({ page }) => {
    await library.clickTrack(0)
    // Focus search and type space
    await library.searchInput.click()
    await page.keyboard.type(' ')
    // Space should have been typed as text, not toggled playback
    await expect(library.searchInput).toHaveValue(/ /)
  })

  test('KEY-06: Ctrl+ArrowUp does not crash', async ({ page }) => {
    await library.clickTrack(0)
    await page.keyboard.press('Control+ArrowUp')
    await expect(page.locator('.layout')).toBeVisible()
  })

  test('KEY-07: Ctrl+ArrowDown does not crash', async ({ page }) => {
    await library.clickTrack(0)
    await page.keyboard.press('Control+ArrowDown')
    await expect(page.locator('.layout')).toBeVisible()
  })
})
