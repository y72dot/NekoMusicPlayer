import { test, expect } from '@playwright/test'
import { LibraryPage } from '../pages/LibraryPage'
import { audioMockScript, seedTracks } from '../fixtures/test-helpers'

test.beforeEach(async ({ page }) => {
  await page.addInitScript(audioMockScript)
})

test.describe('Control Bar', () => {
  let library: LibraryPage

  test.beforeEach(async ({ page }) => {
    library = new LibraryPage(page)
  })

  test.describe('with tracks', () => {
    test.beforeEach(async ({ page }) => {
      await seedTracks(page, 3)
      library = new LibraryPage(page)
    })

    test('CTR-01: play/pause button exists and is clickable', async () => {
      await expect(library.btnPlay).toBeVisible()
      // Button should show either play or pause icon
      const text = await library.btnPlay.textContent()
      expect(text).toMatch(/▶️|⏸/)
    })

    test('CTR-02: next button exists', async () => {
      await expect(library.btnNext).toBeVisible()
      await library.clickTrack(0)
      // Clicking next should not crash
      await library.clickNext()
      await expect(library.trackRows.first()).toBeVisible()
    })

    test('CTR-03: prev button exists', async () => {
      await expect(library.btnPrev).toBeVisible()
      await library.clickTrack(0)
      await library.clickPrev()
      await expect(library.trackRows.first()).toBeVisible()
    })

    test('CTR-04: mode select has 3 options', async () => {
      const options = library.modeSelect.locator('option')
      await expect(options).toHaveCount(3)
    })

    test('CTR-05: can switch to shuffle mode', async () => {
      await library.selectMode('shuffle')
      await expect(library.modeSelect).toHaveValue('shuffle')
    })

    test('CTR-06: can switch to single mode', async () => {
      await library.selectMode('single')
      await expect(library.modeSelect).toHaveValue('single')
    })

    test('CTR-07: can switch to loop mode', async () => {
      await library.selectMode('loop')
      await expect(library.modeSelect).toHaveValue('loop')
    })

    test('CTR-08: volume slider is interactive', async () => {
      await library.setVolume(0.75)
      const value = Number(await library.volumeSlider.inputValue())
      expect(value).toBeCloseTo(0.75, 1)
    })

    test('CTR-09: time display is visible', async () => {
      await library.clickTrack(0)
      // Time should show something - may show 0:00 or mock time
      await expect(library.timeText).toBeVisible()
    })

    test('CTR-10: seek bar is visible', async () => {
      await expect(library.seekBar).toBeVisible()
    })
  })
})
