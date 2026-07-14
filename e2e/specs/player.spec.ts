import { test, expect } from '@playwright/test'
import { PlayerPage } from '../pages/PlayerPage'
import { LibraryPage } from '../pages/LibraryPage'
import { audioMockScript, seedTracks } from '../fixtures/test-helpers'

test.beforeEach(async ({ page }) => {
  await page.addInitScript(audioMockScript)
})

test.describe('Player (Queue)', () => {
  test('PLR-01: empty queue shows empty state', async ({ page }) => {
    const player = new PlayerPage(page)
    await player.clearAllData()
    await page.reload()
    await player.goto()
    await expect(player.emptyState).toBeVisible()
    await expect(player.trackRows).toHaveCount(0)
  })

  test.describe('with tracks', () => {
    test.beforeEach(async ({ page }) => {
      await seedTracks(page, 3)
      // Use LibraryPage to click a track (we're on library page after seedTracks)
      const library = new LibraryPage(page)
      await library.clickTrack(0)
      // Navigate to player
      const player = new PlayerPage(page)
      await player.navPlayer.click()
      await expect(page.locator('.player-page')).toBeVisible()
    })

    test('PLR-02: player page renders', async ({ page }) => {
      await expect(page.locator('.player-page')).toBeVisible()
    })

    test('PLR-03: player has control bar', async ({ page }) => {
      await expect(page.locator('.bar')).toBeVisible()
    })
  })
})
