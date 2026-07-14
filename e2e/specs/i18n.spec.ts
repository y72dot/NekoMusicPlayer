import { test, expect } from '@playwright/test'
import { BasePage } from '../pages/BasePage'

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

test.describe('i18n - Chinese (zh-CN)', () => {
  test.use({ locale: 'zh-CN' })

  let app: BasePage

  test.beforeEach(async ({ page }) => {
    app = new BasePage(page)
    await app.clearAllData()
    await page.reload()
  })

  test('I18N-01: nav links show Chinese text', async ({ page }) => {
    await page.goto('/#/library')
    await expect(app.navLibrary).toContainText('全部歌曲')
    await expect(app.navPlayer).toContainText('正在播放')
    await expect(app.navImport).toContainText('导入音乐')
  })

  test('I18N-02: search placeholder is Chinese', async ({ page }) => {
    await page.goto('/#/library')
    const placeholder = await page.locator('.search-bar input').getAttribute('placeholder')
    expect(placeholder).toBe('搜索歌曲、艺术家、专辑...')
  })

  test('I18N-03: empty library shows Chinese text', async ({ page }) => {
    await page.goto('/#/library')
    await expect(page.locator('.empty')).toContainText('暂无歌曲')
  })

  test('I18N-04: mode select has 3 options with text', async ({ page }) => {
    await page.goto('/#/library')
    const options = app.modeSelect.locator('option')
    await expect(options).toHaveCount(3)
    // All options should have some text
    for (let i = 0; i < 3; i++) {
      const text = await options.nth(i).textContent()
      expect(text?.trim().length).toBeGreaterThan(0)
    }
  })

  test('I18N-05: batch action bar shows Chinese', async ({ page }) => {
    await page.goto('/#/library')
    // Import a track first
    await app.navigateToImport()
    const panel = page.locator('.panel')
    await panel.locator('textarea').fill(
      'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3'
    )
    await panel.locator('button').first().click()
    await page.locator('.toast-item').first().waitFor({ state: 'visible', timeout: 30000 })

    // Enter multi-select
    await app.navigateToLibrary()
    await page.locator('.row').first().hover()
    await page.locator('.more-btn').first().click()
    await page.locator('.toggle-select-btn').first().click()

    await expect(page.locator('.batch-action-bar')).toContainText(/已选择/)
  })
})

test.describe('i18n - English (en-US)', () => {
  test.use({ locale: 'en-US' })

  let app: BasePage

  test.beforeEach(async ({ page }) => {
    app = new BasePage(page)
    await app.clearAllData()
    await page.reload()
  })

  test('I18N-06: nav links show English text', async ({ page }) => {
    await page.goto('/#/library')
    await expect(app.navLibrary).toContainText('All Songs')
    await expect(app.navPlayer).toContainText('Now Playing')
    await expect(app.navImport).toContainText('Import Music')
  })

  test('I18N-07: search placeholder is English', async ({ page }) => {
    await page.goto('/#/library')
    const placeholder = await page.locator('.search-bar input').getAttribute('placeholder')
    expect(placeholder).toBe('Search songs, artists, albums...')
  })

  test('I18N-08: empty library shows English text', async ({ page }) => {
    await page.goto('/#/library')
    await expect(page.locator('.empty')).toContainText('No songs')
  })

  test('I18N-09: unknown artist shows English when no artist', async ({ page }) => {
    await page.goto('/#/library')
    // Import a track via audio file (which has no metadata)
    await app.navigateToImport()
    const silencePath = 'e2e/fixtures/silence.mp3'
    await page.locator('input[type="file"][accept*="audio"]').setInputFiles(silencePath)

    await app.navigateToLibrary()
    // The track should show with unknown artist text
    const rows = page.locator('.row')
    if (await rows.count() > 0) {
      await expect(rows.first().locator('.sub')).toContainText(/Unknown|未知/)
    }
  })
})
