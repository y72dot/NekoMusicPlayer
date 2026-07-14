import type { Page, Locator } from '@playwright/test'
import { BasePage } from './BasePage'

export class ImportPage extends BasePage {
  readonly urlTextarea: Locator
  readonly btnImportUrl: Locator
  readonly fileInput: Locator
  readonly btnExport: Locator
  readonly jsonFileInput: Locator
  readonly panel: Locator

  constructor(page: Page) {
    super(page)

    this.panel = page.locator('.panel')
    this.urlTextarea = this.panel.locator('textarea')
    // The first button in .panel is "导入" for URLs
    // First button in .panel (before .json div) is the URL import button
    this.btnImportUrl = this.panel.locator('button').first()
    this.fileInput = this.panel.locator('input[type="file"][accept*="audio"]')
    this.btnExport = this.panel.locator('.json button')
    this.jsonFileInput = this.panel.locator('.json input[type="file"]')
  }

  async goto() {
    await super.goto('/import')
  }

  async importUrls(urls: string[]) {
    await this.urlTextarea.fill(urls.join('\n'))
    await this.btnImportUrl.click()
  }

  async importUrl(url: string) {
    await this.importUrls([url])
  }

  async uploadAudioFiles(paths: string[]) {
    await this.fileInput.setInputFiles(paths)
  }

  async clickExport() {
    await this.btnExport.click()
  }

  async importJsonFile(path: string) {
    await this.jsonFileInput.setInputFiles(path)
  }
}
