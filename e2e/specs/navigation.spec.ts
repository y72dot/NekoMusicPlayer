import { test, expect } from '@playwright/test'
import { BasePage } from '../pages/BasePage'

test.describe('Navigation', () => {
  let app: BasePage

  test.beforeEach(async ({ page }) => {
    app = new BasePage(page)
    await app.clearAllData()
    await page.reload()
  })

  test('NAV-01: default route redirects to /library', async ({ page }) => {
    await page.goto('/')
    // Wait for Vue hash router redirect (hash fragment won't trigger waitForURL)
    await expect(page.locator('.library-page')).toBeVisible({ timeout: 10000 })
    expect(page.url()).toContain('#/library')
  })

  test('NAV-02: sidebar Library link navigates to /library', async ({ page }) => {
    await page.goto('/#/player')
    await expect(page.locator('.player-page')).toBeVisible()

    await app.navLibrary.click()
    await expect(page.locator('.library-page')).toBeVisible()
    await expect(app.navLibrary).toHaveClass(/active/)
  })

  test('NAV-03: sidebar Player link navigates to /player', async ({ page }) => {
    await page.goto('/#/library')
    await expect(page.locator('.library-page')).toBeVisible()

    await app.navPlayer.click()
    await expect(page.locator('.empty')).toBeVisible()
    await expect(app.navPlayer).toHaveClass(/active/)
  })

  test('NAV-04: sidebar Import link navigates to /import', async ({ page }) => {
    await page.goto('/#/library')

    await app.navImport.click()
    await expect(page.locator('.panel')).toBeVisible()
  })

  test('NAV-05: clicking playlist name navigates to /playlist/:id', async ({ page }) => {
    await page.goto('/#/library')
    await page.once('dialog', d => d.accept('My Playlist'))
    await app.btnCreatePlaylist.click()
    // Wait for playlist page to render
    await expect(page.locator('.playlist-page h2')).toContainText('My Playlist', { timeout: 5000 })
    // Sidebar should highlight the playlist
    await expect(app.playlistItems.filter({ hasText: 'My Playlist' })).toHaveClass(/active/)
  })

  test('NAV-06: current nav link gets active class', async ({ page }) => {
    await page.goto('/#/player')
    await expect(page.locator('.player-page')).toBeVisible()
    await expect(app.navPlayer).toHaveClass(/active/)
    await expect(app.navLibrary).not.toHaveClass(/active/)

    await app.navLibrary.click()
    await expect(page.locator('.library-page')).toBeVisible()
    await expect(app.navLibrary).toHaveClass(/active/)
    await expect(app.navPlayer).not.toHaveClass(/active/)
  })

  test('NAV-07: direct hash URL access renders correct page', async ({ page }) => {
    await page.goto('/#/import')
    await expect(page.locator('.panel')).toBeVisible()

    await page.goto('/#/player')
    await expect(page.locator('.empty')).toBeVisible()
  })

  test('NAV-08: browser back/forward works', async ({ page }) => {
    await page.goto('/#/library')
    await app.navPlayer.click()
    await expect(page.locator('.player-page')).toBeVisible()
    await app.navImport.click()
    await expect(page.locator('.panel')).toBeVisible()

    await page.goBack()
    await expect(page.locator('.player-page')).toBeVisible()

    await page.goForward()
    await expect(page.locator('.panel')).toBeVisible()
  })
})
