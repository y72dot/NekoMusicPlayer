import type { Page, Locator } from '@playwright/test'
import { BasePage } from './BasePage'

export class PlaylistsPage extends BasePage {
  readonly searchInput: Locator
  readonly trackRows: Locator
  readonly trackCount: Locator
  readonly playlistName: Locator
  readonly btnPlayAll: Locator
  readonly btnDeletePlaylist: Locator
  readonly emptyState: Locator
  readonly batchActionBar: Locator

  constructor(page: Page) {
    super(page)

    const pageRoot = page.locator('.playlist-page')
    this.searchInput = pageRoot.locator('.search-bar input')
    this.trackRows = pageRoot.locator('.row')
    this.trackCount = pageRoot.locator('.meta span').first()
    this.playlistName = pageRoot.locator('h2')
    this.btnPlayAll = pageRoot.locator('button.primary')
    this.btnDeletePlaylist = pageRoot.locator('button.danger')
    this.emptyState = page.locator('.empty-state')
    this.batchActionBar = page.locator('.batch-action-bar')
  }

  async goto(playlistId?: string) {
    if (playlistId) {
      await super.goto(`/playlist/${playlistId}`)
    } else {
      await super.goto('/playlists')
    }
  }

  async search(query: string) {
    await this.searchInput.fill(query)
  }

  async clickTrack(index: number) {
    await this.trackRows.nth(index).click()
  }

  async startRename() {
    await this.playlistName.click()
  }

  async renamePlaylist(newName: string) {
    await this.startRename()
    const input = this.page.locator('.playlist-page input[type="text"], .playlist-page h2 input').first()
    await input.fill(newName)
    await input.press('Enter')
  }

  async playAll() {
    await this.btnPlayAll.click()
  }

  async deletePlaylist() {
    await this.btnDeletePlaylist.click()
  }

  async getPlaylistTrackCount(): Promise<string> {
    const text = await this.trackCount.textContent()
    return text ?? ''
  }
}
