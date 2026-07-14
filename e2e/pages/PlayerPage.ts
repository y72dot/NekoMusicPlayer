import type { Page, Locator } from '@playwright/test'
import { BasePage } from './BasePage'

export class PlayerPage extends BasePage {
  readonly searchInput: Locator
  readonly trackRows: Locator
  readonly trackCount: Locator
  readonly emptyState: Locator
  readonly batchActionBar: Locator
  readonly headerTitle: Locator

  constructor(page: Page) {
    super(page)

    const pageRoot = page.locator('.player-page')
    this.searchInput = pageRoot.locator('.search-bar input')
    this.trackRows = pageRoot.locator('.row')
    this.trackCount = pageRoot.locator('.count')
    this.emptyState = pageRoot.locator('.empty')
    this.batchActionBar = page.locator('.batch-action-bar')
    this.headerTitle = pageRoot.locator('h2')
  }

  async goto() {
    await super.goto('/player')
  }

  async search(query: string) {
    await this.searchInput.fill(query)
  }

  async clickTrack(index: number) {
    await this.trackRows.nth(index).click()
  }

  async getTrackTitle(index: number): Promise<string> {
    const title = this.trackRows.nth(index).locator('.title')
    return (await title.textContent()) ?? ''
  }

  // Drag and drop reorder
  async dragTrack(fromIndex: number, toIndex: number) {
    const fromRow = this.trackRows.nth(fromIndex)
    const toRow = this.trackRows.nth(toIndex)
    await fromRow.dragTo(toRow)
  }
}
