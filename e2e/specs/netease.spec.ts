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

test.describe('Netease Import', () => {
  let importPage: ImportPage

  test.beforeEach(async ({ page }) => {
    importPage = new ImportPage(page)
    await importPage.clearAllData()
    await page.reload()
    await importPage.goto()
  })

  test('NE-01: Netease section is visible', async () => {
    await expect(importPage.neteaseTextarea).toBeVisible()
    await expect(importPage.neteaseTypeSelect).toBeVisible()
    await expect(importPage.btnImportNetease).toBeVisible()
  })

  test('NE-02: cookie warning is visible when cookie not configured', async () => {
    await expect(importPage.cookieWarning).toBeVisible()
    await expect(importPage.cookieWarning).toContainText(/cookie|Cookie|未设置/)
  })

  test('NE-03: clicking cookie warning opens settings', async () => {
    await importPage.cookieWarning.click()
    // Cookie settings should now be visible
    await expect(importPage.cookieInput).toBeVisible()
    await expect(importPage.csrfInput).toBeVisible()
    await expect(importPage.btnSaveCookie).toBeVisible()
  })

  test('NE-04: can save cookie and warning disappears', async ({ page }) => {
    // Open settings
    await importPage.cookieWarning.click()

    // Fill in cookie values
    await importPage.cookieInput.fill('test_music_u_value')
    await importPage.csrfInput.fill('test_csrf_token')
    await importPage.btnSaveCookie.click()

    // Warning should be hidden now
    await expect(importPage.cookieWarning).not.toBeVisible()
  })

  test('NE-05: type selector has correct options', async () => {
    const values = await importPage.neteaseTypeSelect.locator('option').evaluateAll(
      options => options.map(option => (option as HTMLOptionElement).value),
    )
    expect(values).toEqual(['auto', 'song', 'playlist', 'album'])
  })

  test('NE-06: import without cookie shows error toast', async ({ page }) => {
    // Try to import without cookie configured
    await importPage.neteaseTextarea.fill('12345678')
    await importPage.btnImportNetease.click()

    // Should show cookie required toast
    const toast = page.locator('.toast-container .toast-item.error')
    await toast.waitFor({ state: 'visible', timeout: 5000 })
    await expect(toast).toContainText(/cookie|Cookie|配置/)
  })

  test('NE-07: netease textarea accepts input', async () => {
    await importPage.neteaseTextarea.fill('https://music.163.com/#/song?id=12345678')
    await expect(importPage.neteaseTextarea).toHaveValue('https://music.163.com/#/song?id=12345678')
  })

  test('NE-08: type selector can be changed', async () => {
    await importPage.neteaseTypeSelect.selectOption('playlist')
    await expect(importPage.neteaseTypeSelect).toHaveValue('playlist')

    await importPage.neteaseTypeSelect.selectOption('album')
    await expect(importPage.neteaseTypeSelect).toHaveValue('album')

    await importPage.neteaseTypeSelect.selectOption('song')
    await expect(importPage.neteaseTypeSelect).toHaveValue('song')
  })
})
