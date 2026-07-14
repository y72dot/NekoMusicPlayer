import type { Page, Locator } from '@playwright/test'
import { BasePage } from './BasePage'

export class LibraryPage extends BasePage {
  readonly searchInput: Locator
  readonly trackRows: Locator
  readonly trackCount: Locator
  readonly emptyState: Locator
  readonly batchActionBar: Locator
  readonly moreButtons: Locator
  readonly toggleSelectButtons: Locator
  readonly headerTitle: Locator

  constructor(page: Page) {
    super(page)

    const pageRoot = page.locator('.library-page')
    this.searchInput = pageRoot.locator('.search-bar input')
    this.trackRows = pageRoot.locator('.row')
    this.trackCount = pageRoot.locator('.count')
    this.emptyState = pageRoot.locator('.empty')
    this.batchActionBar = page.locator('.batch-action-bar')
    this.moreButtons = pageRoot.locator('.more-btn')
    this.toggleSelectButtons = pageRoot.locator('.toggle-select-btn')
    this.headerTitle = pageRoot.locator('h2')
  }

  async goto() {
    await super.goto('/library')
  }

  async search(query: string) {
    await this.searchInput.fill(query)
  }

  async clearSearch() {
    await this.searchInput.fill('')
  }

  async clickTrack(index: number) {
    await this.trackRows.nth(index).click()
  }

  async getTrackTitle(index: number): Promise<string> {
    const title = this.trackRows.nth(index).locator('.title')
    return (await title.textContent()) ?? ''
  }

  async enterMultiSelect(index: number = 0) {
    await this.trackRows.nth(index).hover()
    const moreBtn = this.moreButtons.nth(index)
    await moreBtn.click()
    const toggleBtn = this.toggleSelectButtons.nth(index)
    await toggleBtn.click()
  }

  async clickMoreButton(index: number) {
    const row = this.trackRows.nth(index)
    await row.hover()
    await this.moreButtons.nth(index).click()
  }

  async clickActionInMenu(index: number, action: 'play' | 'addToQueue' | 'addToPlaylist' | 'remove') {
    const row = this.trackRows.nth(index)
    await row.hover()
    // Menu expands on hover/click
    const moreBtn = this.moreButtons.nth(index)
    await moreBtn.click()
    // Actions are in .hidden-wrapper buttons: 0=addToPlaylist, 1=remove
    // Visible buttons: 0=play, 1=addToQueue
    // After clicking more, the menu is expanded
    const actionMenu = row.locator('.action-menu')
    const btn = actionMenu.locator('.action-btn').filter({ has: page.locator(`[title]`) })
    // Use title attribute matching
    const titleMap: Record<string, string> = {
      play: '立即播放',
      addToQueue: '加入队列',
      addToPlaylist: '添加到歌单',
      remove: '删除',
    }
    await actionMenu.locator(`.action-btn[title="${titleMap[action]}"]`).click()
  }

  // Batch operations
  async selectAll() {
    await this.batchActionBar.locator('button', { hasText: '全选' }).click()
  }

  async invertSelection() {
    await this.batchActionBar.locator('button', { hasText: '反选' }).click()
  }

  async cancelMultiSelect() {
    await this.batchActionBar.locator('.cancel-btn').click()
  }

  async batchPlay() {
    await this.batchActionBar.locator('.action-btn', { hasText: '播放' }).first().click()
  }

  async batchAddToQueue() {
    await this.batchActionBar.locator('.action-btn', { hasText: '加入队列' }).click()
  }

  async batchAddToPlaylist() {
    await this.batchActionBar.locator('.action-btn', { hasText: '添加到歌单' }).click()
  }

  async batchRemove() {
    await this.batchActionBar.locator('.action-btn.danger').click()
  }
}
