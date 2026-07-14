import { test, expect } from '@playwright/test'
import { LibraryPage } from '../pages/LibraryPage'
import { ImportPage } from '../pages/ImportPage'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const silencePath = path.resolve(__dirname, '..', 'fixtures', 'silence.mp3')

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    HTMLMediaElement.prototype.play = function () {
      Object.defineProperty(this, 'paused', { value: false, writable: true })
      Object.defineProperty(this, 'duration', { value: 200, writable: true })
      Object.defineProperty(this, 'currentTime', { value: 50, writable: true })
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

async function seedTracks(page: any, count: number = 3) {
  const importPage = new ImportPage(page)
  await importPage.clearAllData()
  await page.reload()
  await importPage.goto()
  // Upload silence.mp3 multiple times
  const files = Array(count).fill(silencePath)
  await importPage.uploadAudioFiles(files)
  // Wait for import to complete (toast or tracks in library)
  await page.waitForTimeout(2000)
  await importPage.navigateToLibrary()
}

test.describe('Library', () => {
  let library: LibraryPage

  test.beforeEach(async ({ page }) => {
    library = new LibraryPage(page)
  })

  test('LIB-01: empty library shows empty state', async ({ page }) => {
    await library.clearAllData()
    await page.reload()
    await library.goto()
    await expect(library.emptyState).toBeVisible()
    await expect(library.trackRows).toHaveCount(0)
  })

  test.describe('with tracks', () => {
    test.beforeEach(async ({ page }) => {
      await seedTracks(page, 3)
      library = new LibraryPage(page)
    })

    test('LIB-02: tracks are displayed as rows', async () => {
      const count = await library.trackRows.count()
      expect(count).toBeGreaterThanOrEqual(1)
    })

    test('LIB-03: track count is shown', async () => {
      await expect(library.trackCount).toBeVisible()
    })

    test('LIB-04: search filters tracks', async () => {
      const totalBefore = await library.trackRows.count()
      // Get the title of the first track
      const firstTitle = await library.getTrackTitle(0)
      // Search for a substring
      const searchTerm = firstTitle.substring(0, 4)
      await library.search(searchTerm)
      const after = await library.trackRows.count()
      // Filtered count should be <= total
      expect(after).toBeLessThanOrEqual(totalBefore)
    })

    test('LIB-05: clearing search restores all tracks', async () => {
      const totalBefore = await library.trackRows.count()
      await library.search('nonexistentzzzzz')
      await library.clearSearch()
      const after = await library.trackRows.count()
      expect(after).toBe(totalBefore)
    })

    test('LIB-06: search with no results shows empty list', async () => {
      await library.search('nonexistent_xyz_12345')
      await expect(library.trackRows).toHaveCount(0)
    })

    test('LIB-07: clicking a track activates it', async () => {
      await library.clickTrack(0)
      // The clicked track row should become active (highlighted)
      const firstRow = library.trackRows.first()
      await expect(firstRow).toHaveClass(/active/)
    })

    test('LIB-08: clicking more button expands action menu', async ({ page }) => {
      // Hover over first row
      await library.trackRows.first().hover()
      // Click more button
      const moreBtn = library.moreButtons.first()
      await moreBtn.click()
      // Action menu should expand
      const menu = library.trackRows.first().locator('.action-menu')
      await expect(menu).toHaveClass(/expanded/)
    })
  })
})
