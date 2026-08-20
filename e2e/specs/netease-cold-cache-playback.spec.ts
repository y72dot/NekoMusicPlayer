import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { test, expect } from '@playwright/test'
import { ImportPage } from '../pages/ImportPage'
import { LibraryPage } from '../pages/LibraryPage'

const fixtureDir = path.dirname(fileURLToPath(import.meta.url))
const silenceMp3 = readFileSync(path.resolve(fixtureDir, '../fixtures/silence.mp3'))

test.use({ serviceWorkers: 'block' })

test('cold-cache NetEase playback preserves credentials, protocol and media streaming', async ({ page }) => {
  let credentialHeader = ''
  let mediaRequestUrl = ''
  let mediaRangeHeader = ''

  await page.addInitScript(() => {
    const NativeAudio = window.Audio
    const CapturedAudio = function (src?: string) {
      const audio = new NativeAudio(src)
      ;(window as typeof window & { __acceptanceAudio?: HTMLAudioElement }).__acceptanceAudio = audio
      return audio
    } as typeof Audio
    CapturedAudio.prototype = NativeAudio.prototype
    window.Audio = CapturedAudio
  })

  await page.route('**/api/netease/weapi/**', async route => {
    const request = route.request()
    credentialHeader = request.headers()['x-neko-upstream-cookie'] || credentialHeader
    if (request.url().includes('/v3/song/detail')) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          code: 200,
          songs: [{
            id: 12345678,
            name: 'Cold Cache Acceptance',
            ar: [{ id: 1, name: 'Neko' }],
            al: { id: 1, name: 'Acceptance', picUrl: 'http://p1.music.126.net/cover.jpg' },
            dt: 10_000,
          }],
        }),
      })
      return
    }

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        code: 200,
        data: [{
          id: 12345678,
          url: 'http://m704.music.126.net/acceptance/silence.mp3?authSecret=signed+value',
          br: 128000,
          size: silenceMp3.length,
          type: 'mp3',
        }],
      }),
    })
  })

  let markMediaRequested!: () => void
  const mediaRequested = new Promise<void>(resolve => {
    markMediaRequested = resolve
  })
  await page.route('**/api/netease-media/**', async route => {
    const request = route.request()
    mediaRequestUrl = request.url()
    mediaRangeHeader = request.headers().range || ''
    const rangeRequested = Boolean(mediaRangeHeader)
    await route.fulfill({
      status: rangeRequested ? 206 : 200,
      headers: {
        'Content-Type': 'audio/mpeg',
        'Content-Length': String(silenceMp3.length),
        'Accept-Ranges': 'bytes',
        ...(rangeRequested
          ? { 'Content-Range': `bytes 0-${silenceMp3.length - 1}/${silenceMp3.length}` }
          : {}),
      },
      body: silenceMp3,
    })
    markMediaRequested()
  })

  const importPage = new ImportPage(page)
  await importPage.clearAllData()
  await page.reload()
  await importPage.goto()

  await importPage.cookieWarning.click()
  await importPage.cookieInput.fill('acceptance_music_u')
  await importPage.csrfInput.fill('acceptance_csrf')
  await importPage.btnSaveCookie.click()
  await importPage.neteaseTextarea.fill('12345678')
  await importPage.neteaseTypeSelect.selectOption('song')
  await importPage.btnImportNetease.click()

  const library = new LibraryPage(page)
  await library.navigateToLibrary()
  await expect(library.trackRows).toHaveCount(1)
  await library.clickTrack(0)
  await mediaRequested

  expect(credentialHeader).toContain('MUSIC_U=acceptance_music_u')
  expect(credentialHeader).toContain('__csrf=acceptance_csrf')
  expect(mediaRequestUrl).toContain('/api/netease-media/http/m704.music.126.net/acceptance/silence.mp3')
  expect(mediaRequestUrl).toContain('authSecret=signed+value')
  expect(mediaRequestUrl).not.toContain('https/m704.music.126.net')
  expect(mediaRangeHeader === '' || mediaRangeHeader.startsWith('bytes=')).toBe(true)

  const audioSrc = await page.evaluate(() =>
    (window as typeof window & { __acceptanceAudio?: HTMLAudioElement }).__acceptanceAudio?.src || '',
  )
  expect(audioSrc).toContain('/api/netease-media/http/m704.music.126.net/')
  await expect(page.locator('.toast-item.error')).toHaveCount(0)
})
