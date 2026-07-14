import { test, expect } from '@playwright/test'
import { LibraryPage } from '../pages/LibraryPage'
import { PlayerPage } from '../pages/PlayerPage'

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    HTMLMediaElement.prototype.play = function () {
      Object.defineProperty(this, 'paused', { value: false, writable: true })
      Object.defineProperty(this, 'duration', { value: 200, writable: true })
      Object.defineProperty(this, 'currentTime', { value: 0, writable: true })
      this.dispatchEvent(new Event('loadedmetadata'))
      this.dispatchEvent(new Event('canplay'))
      return Promise.resolve()
    }
    HTMLMediaElement.prototype.pause = function () {
      Object.defineProperty(this, 'paused', { value: true, writable: true })
      return undefined
    }
  })
})

test.describe('Edge Cases', () => {
  test('EDG-01: rapid play/pause clicks do not crash', async ({ page }) => {
    const library = new LibraryPage(page)
    await library.clearAllData()
    await page.reload()

    await library.goto()
    // Click play 10 times rapidly (should be safe)
    for (let i = 0; i < 10; i++) {
      await library.clickPlay()
    }
    // Page should still be responsive
    await expect(page.locator('.layout')).toBeVisible()
  })

  test('EDG-02: rapid prev/next clicks do not crash', async ({ page }) => {
    const library = new LibraryPage(page)
    await library.clearAllData()
    await page.reload()

    await library.goto()
    for (let i = 0; i < 10; i++) {
      await library.clickNext()
      await library.clickPrev()
    }
    await expect(page.locator('.layout')).toBeVisible()
  })

  test('EDG-03: empty library operations do not crash', async ({ page }) => {
    const library = new LibraryPage(page)
    await library.clearAllData()
    await page.reload()
    await library.goto()

    // Search in empty library
    await library.search('test')
    await library.clearSearch()
    // Play with empty library should show toast
    await library.clickPlay()

    // App should not crash
    await expect(page.locator('.layout')).toBeVisible()
  })

  test('EDG-04: empty queue operations are safe', async ({ page }) => {
    const player = new PlayerPage(page)
    await player.clearAllData()
    await page.reload()

    // Go directly to player (empty queue)
    await player.goto()
    await expect(player.emptyState).toBeVisible()

    // Click prev/next on empty queue
    await player.clickPrev()
    await player.clickNext()
    await expect(page.locator('.layout')).toBeVisible()
  })

  test('EDG-05: special regex characters in search do not crash', async ({ page }) => {
    const library = new LibraryPage(page)
    await library.clearAllData()
    await page.reload()
    await library.goto()

    // Search with special regex characters
    await library.search('(')
    await library.clearSearch()
    await library.search('[')
    await library.clearSearch()
    await library.search('.')
    await library.clearSearch()
    await library.search('\\')
    await library.clearSearch()
    await library.search('*')

    await expect(page.locator('.layout')).toBeVisible()
  })

  test('EDG-06: reload preserves data (IndexedDB)', async ({ page }) => {
    const { seedTracks } = await import('../fixtures/test-helpers')
    await seedTracks(page, 2)
    const library = new LibraryPage(page)

    const beforeCount = await library.trackRows.count()
    expect(beforeCount).toBeGreaterThanOrEqual(1)

    await page.reload()
    await library.navigateToLibrary()

    await expect(library.trackRows).toHaveCount(beforeCount)
  })

  test('EDG-07: works with duplicate track titles (different IDs)', async ({ page }) => {
    const { seedTracks } = await import('../fixtures/test-helpers')
    // Import twice
    await seedTracks(page, 3)
    // Import again
    await seedTracks(page, 3)

    const library = new LibraryPage(page)
    const count = await library.trackRows.count()
    // Should have at least as many as one import batch
    expect(count).toBeGreaterThanOrEqual(3)
  })
})
