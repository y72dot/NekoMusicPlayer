import { test, expect } from '@playwright/test'

test.describe('Responsive and accessible shell', () => {
  test('RSP-01: 360px layout has no horizontal overflow and keeps core controls', async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 760 })
    await page.goto('/#/library')

    await expect(page.getByRole('navigation', { name: /主导航|Main navigation/ })).toBeVisible()
    await expect(page.getByRole('button', { name: /播放|Play/ })).toBeVisible()

    const dimensions = await page.evaluate(() => ({
      viewport: window.innerWidth,
      document: document.documentElement.scrollWidth,
      body: document.body.scrollWidth,
    }))
    expect(dimensions.document).toBeLessThanOrEqual(dimensions.viewport)
    expect(dimensions.body).toBeLessThanOrEqual(dimensions.viewport)
  })

  test('RSP-02: playback controls expose accessible names', async ({ page }) => {
    await page.goto('/#/library')

    await expect(page.getByRole('button', { name: /上一首|Previous/ })).toBeAttached()
    await expect(page.getByRole('button', { name: /下一首|Next/ })).toBeAttached()
    await expect(page.getByRole('slider', { name: /播放进度|Playback progress/ })).toBeAttached()
    await expect(page.getByRole('slider', { name: /音量|Volume/ })).toBeAttached()
    await expect(page.getByRole('combobox', { name: /播放模式|Playback mode/ })).toBeAttached()
  })
})
