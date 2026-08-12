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
    this.urlTextarea = page.getByTestId('external-url-input')
    this.btnImportUrl = page.getByTestId('external-url-import')
    this.fileInput = this.panel.locator('input[type="file"][accept*="audio"]')
    this.btnExport = this.panel.locator('.json button')
    this.jsonFileInput = this.panel.locator('.json input[type="file"]')

    // Netease section
    this.neteaseTextarea = page.getByTestId('netease-input')
    this.neteaseTypeSelect = page.getByTestId('netease-type')
    this.btnImportNetease = page.getByTestId('netease-import')
    this.cookieWarning = page.getByTestId('netease-cookie-warning')
    this.cookieInput = page.getByTestId('netease-cookie-settings').locator('input').nth(0)
    this.csrfInput = page.getByTestId('netease-cookie-settings').locator('input').nth(1)
    this.btnSaveCookie = page.getByTestId('netease-cookie-save')
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
