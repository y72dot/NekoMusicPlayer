import type { Page } from '@playwright/test'
import { ImportPage } from '../pages/ImportPage'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const silencePath = path.resolve(__dirname, 'silence.mp3')

/**
 * Import silence.mp3 files to seed the library with test tracks.
 * Returns after tracks are imported (or timeout).
 */
export async function seedTracks(page: Page, count: number = 3): Promise<void> {
  const importPage = new ImportPage(page)
  await importPage.clearAllData()
  await page.reload()
  await importPage.goto()
  const files = Array(count).fill(silencePath)
  await importPage.uploadAudioFiles(files)
  // Wait for import to complete
  await page.waitForTimeout(3000)
  await importPage.navigateToLibrary()
}

/**
 * Audio mock script to inject before page load.
 * Makes HTMLMediaElement.play() a no-op that sets paused=false.
 */
export const audioMockScript = () => {
  HTMLMediaElement.prototype.play = function () {
    Object.defineProperty(this, 'paused', { value: false, writable: true })
    Object.defineProperty(this, 'duration', { value: 200, writable: true })
    Object.defineProperty(this, 'currentTime', { value: 50, writable: true })
    this.dispatchEvent(new Event('loadedmetadata'))
    this.dispatchEvent(new Event('canplay'))
    return Promise.resolve()
  }
  HTMLMediaElement.prototype.pause = function () {
    Object.defineProperty(this, 'paused', { value: true, writable: true })
    return undefined
  }
}
