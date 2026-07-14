import type { Page, Locator } from '@playwright/test'

export class BasePage {
  readonly page: Page

  // Sidebar
  readonly sidebar: Locator
  readonly navLibrary: Locator
  readonly navPlayer: Locator
  readonly navImport: Locator
  readonly playlistItems: Locator
  readonly btnCreatePlaylist: Locator

  // Control bar
  readonly controlBar: Locator
  readonly btnPlay: Locator
  readonly btnPrev: Locator
  readonly btnNext: Locator
  readonly seekBar: Locator
  readonly volumeSlider: Locator
  readonly modeSelect: Locator
  readonly timeText: Locator

  // Toast
  readonly toastContainer: Locator
  readonly toastItems: Locator

  constructor(page: Page) {
    this.page = page

    // Sidebar selectors
    this.sidebar = page.locator('.side')
    this.navLibrary = page.locator('.nav-item[href="#/library"]')
    this.navPlayer = page.locator('.nav-item[href="#/player"]')
    this.navImport = page.locator('.nav-item[href="#/import"]')
    this.playlistItems = page.locator('.side ul li')
    this.btnCreatePlaylist = page.locator('.side .top button')

    // Control bar selectors
    this.controlBar = page.locator('.bar')
    this.btnPlay = page.locator('.bar button').nth(1)
    this.btnPrev = page.locator('.bar button').nth(0)
    this.btnNext = page.locator('.bar button').nth(2)
    this.seekBar = page.locator('.bar input[type="range"]').nth(0)
    this.volumeSlider = page.locator('.bar input[type="range"]').nth(1)
    this.modeSelect = page.locator('.bar select')
    this.timeText = page.locator('.bar span')

    // Toast selectors
    this.toastContainer = page.locator('.toast-container')
    this.toastItems = page.locator('.toast-container .toast-item')
  }

  // ── Navigation helpers ──

  async goto(url: string) {
    await this.page.goto(`/#${url}`)
    await this.page.waitForLoadState('domcontentloaded')
  }

  async navigateToLibrary() {
    await this.navLibrary.click()
    await this.page.locator('.library-page').waitFor({ state: 'visible', timeout: 5000 })
  }

  async navigateToPlayer() {
    await this.navPlayer.click()
    await this.page.locator('.player-page').waitFor({ state: 'visible', timeout: 5000 })
  }

  async navigateToImport() {
    await this.navImport.click()
    await this.page.locator('.panel').waitFor({ state: 'visible', timeout: 5000 })
  }

  async navigateToPlaylists() {
    await this.page.goto('/#/playlists')
    await this.page.locator('.playlist-page, .empty-state').waitFor({ state: 'visible', timeout: 5000 })
  }

  // ── Control bar helpers ──

  async clickPlay() {
    await this.btnPlay.click()
  }

  async clickNext() {
    await this.btnNext.click()
  }

  async clickPrev() {
    await this.btnPrev.click()
  }

  async selectMode(mode: 'single' | 'loop' | 'shuffle') {
    await this.modeSelect.selectOption(mode)
  }

  async seekTo(value: number) {
    await this.seekBar.fill(String(value))
  }

  async setVolume(value: number) {
    await this.volumeSlider.fill(String(value))
  }

  // ── Toast helpers ──

  async getToastCount(): Promise<number> {
    return this.toastItems.count()
  }

  async getToastByText(text: string): Promise<Locator> {
    return this.toastItems.filter({ hasText: text })
  }

  async waitForToast(text?: string): Promise<Locator> {
    if (text) {
      const toast = this.toastContainer.locator('.toast-item', { hasText: text })
      await toast.waitFor({ state: 'visible', timeout: 5000 })
      return toast
    }
    const toast = this.toastItems.first()
    await toast.waitFor({ state: 'visible', timeout: 5000 })
    return toast
  }

  async waitForToastGone() {
    await this.toastItems.first().waitFor({ state: 'hidden', timeout: 8000 }).catch(() => {
      // Toast may already be gone
    })
  }

  // ── Playlist helpers ──

  async createPlaylist(name: string) {
    await this.page.once('dialog', d => d.accept(name))
    await this.btnCreatePlaylist.click()
    await this.page.locator('.playlist-page').waitFor({ state: 'visible', timeout: 5000 })
  }

  async clickPlaylist(name: string) {
    await this.playlistItems.filter({ hasText: name }).click()
    await this.page.locator('.playlist-page').waitFor({ state: 'visible', timeout: 5000 })
  }

  // ── Cleanup helper ──

  async clearAllData() {
    await this.page.goto('/')
    await this.page.evaluate(() => {
      indexedDB.databases().then(dbs =>
        dbs.forEach(db => indexedDB.deleteDatabase(db.name!))
      )
      localStorage.clear()
    })
  }
}
