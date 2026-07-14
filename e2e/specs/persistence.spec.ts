import { test, expect } from '@playwright/test'
import { LibraryPage } from '../pages/LibraryPage'
import { audioMockScript, seedTracks } from '../fixtures/test-helpers'

test.beforeEach(async ({ page }) => {
  await page.addInitScript(audioMockScript)
})

test.describe('Persistence', () => {
  test('PRS-01: library persists across page reloads', async ({ page }) => {
    const library = new LibraryPage(page)
    await seedTracks(page, 2)

    await expect(library.trackRows).not.toHaveCount(0)
    const beforeCount = await library.trackRows.count()

    await page.reload()
    await library.navigateToLibrary()

    await expect(library.trackRows).toHaveCount(beforeCount)
  })

  test('PRS-02: playlists persist across page reloads', async ({ page }) => {
    const library = new LibraryPage(page)
    await seedTracks(page, 1)

    // Create a playlist
    await page.once('dialog', d => d.accept('Persistent'))
    await library.btnCreatePlaylist.click()
    await expect(page.locator('.playlist-page')).toBeVisible()

    // Reload and check playlist still exists
    await page.reload()
    await library.navigateToLibrary()
    await library.clickPlaylist('Persistent')
    await expect(page.locator('.playlist-page h2')).toContainText('Persistent')
  })

  test('PRS-03: volume setting persists across reloads', async ({ page }) => {
    const library = new LibraryPage(page)
    await library.clearAllData()
    await page.reload()
    await library.goto()

    await library.setVolume(0.7)
    await page.reload()
    await library.goto()

    const value = Number(await library.volumeSlider.inputValue())
    expect(value).toBeCloseTo(0.7, 1)
  })
})
