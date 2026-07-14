import type { Page, Locator } from '@playwright/test'
import { BasePage } from './BasePage'

export class ImportPage extends BasePage {
  readonly urlTextarea: Locator
  readonly btnImportUrl: Locator
  readonly fileInput: Locator
  readonly btnExport: Locator
  readonly jsonFileInput: Locator
  readonly panel: Locator

  // Netease section
  readonly neteaseTextarea: Locator
  readonly neteaseTypeSelect: Locator
  readonly btnImportNetease: Locator
  readonly cookieWarning: Locator
  readonly cookieInput: Locator
  readonly csrfInput: Locator
  readonly btnSaveCookie: Locator

  constructor(page: Page) {
    super(page)

    this.panel = page.locator('.panel')
    this.urlTextarea = this.panel.locator('textarea').nth(0)
    this.btnImportUrl = this.panel.locator('button').first()
    this.fileInput = this.panel.locator('input[type="file"][accept*="audio"]')
    this.btnExport = this.panel.locator('.json button')
    this.jsonFileInput = this.panel.locator('.json input[type="file"]')

    // Netease section
    this.neteaseTextarea = this.panel.locator('textarea').nth(1)
    this.neteaseTypeSelect = this.panel.locator('.netease-row select')
    this.btnImportNetease = this.panel.locator('.netease-row button')
    this.cookieWarning = this.panel.locator('.cookie-warning')
    this.cookieInput = this.panel.locator('.cookie-settings input').nth(0)
    this.csrfInput = this.panel.locator('.cookie-settings input').nth(1)
    this.btnSaveCookie = this.panel.locator('.cookie-settings button')
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
