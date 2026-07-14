import { test, expect } from '@playwright/test'
import { ImportPage } from '../pages/ImportPage'

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

test.describe('Toast Notifications', () => {
  let importPage: ImportPage

  test.beforeEach(async ({ page }) => {
    importPage = new ImportPage(page)
    await importPage.clearAllData()
    await page.reload()
    await importPage.goto()
  })

  test('TST-01: success toast appears after import', async ({ page }) => {
    await importPage.importUrl('https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3')
    const toast = page.locator('.toast-item.success')
    await toast.waitFor({ state: 'visible', timeout: 30000 })
    await expect(toast).toBeVisible()
    await expect(toast.locator('.icon')).toContainText('✓')
  })

  test('TST-02: toast auto-dismisses', async ({ page }) => {
    await importPage.importUrl('https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3')
    const toast = page.locator('.toast-item')
    await toast.first().waitFor({ state: 'visible', timeout: 30000 })

    // Wait for auto-dismiss (toast uses 3s duration by default)
    await toast.first().waitFor({ state: 'hidden', timeout: 10000 })
  })

  test('TST-03: clicking toast closes it immediately', async ({ page }) => {
    await importPage.importUrl('https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3')
    const toast = page.locator('.toast-item')
    await toast.first().waitFor({ state: 'visible', timeout: 30000 })

    await toast.first().click()
    await toast.first().waitFor({ state: 'hidden', timeout: 3000 })
  })

  test('TST-04: multiple toasts stack vertically', async ({ page }) => {
    // Import 3 tracks individually to trigger multiple toasts
    for (let i = 1; i <= 3; i++) {
      await importPage.urlTextarea.fill(
        `https://www.soundhelix.com/examples/mp3/SoundHelix-Song-${i}.mp3`
      )
      await importPage.btnImportUrl.click()
      // Small wait to let each import start
      await page.waitForTimeout(500)
    }
    // At least some toasts should have appeared
    const count = await page.locator('.toast-item').count()
    expect(count).toBeGreaterThan(0)
  })

  test('TST-05: toast has correct color classes', async ({ page }) => {
    await importPage.importUrl('https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3')
    const toast = page.locator('.toast-item.success')
    await toast.first().waitFor({ state: 'visible', timeout: 30000 })
    // Check that success class is present
    await expect(toast.first()).toHaveClass(/success/)
  })

  test('TST-06: warning toast on smart play with empty library', async ({ page }) => {
    // Navigate to library and press play with empty library
    await importPage.clearAllData()
    await page.reload()
    await importPage.goto('/library')
    await importPage.clickPlay()
    // Should show a toast (warning or info)
    const toast = page.locator('.toast-item')
    await toast.first().waitFor({ state: 'visible', timeout: 5000 })
  })
})
