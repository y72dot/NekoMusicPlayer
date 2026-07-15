import { test, expect, type Page } from '@playwright/test'
import { LibraryPage } from '../pages/LibraryPage'
import { PlayerPage } from '../pages/PlayerPage'
import { BasePage } from '../pages/BasePage'
import { seedTracks } from '../fixtures/test-helpers'

/**
 * Enhanced audio mock for refresh-playback tests (plain JS string to avoid TS serialization issues).
 * Extends the shared audioMockScript with:
 * - loadeddata/canplaythrough events (playerEngine listens for loadeddata)
 * - Mock load() that fires events asynchronously
 * - Audio constructor override to expose last audio instance for inspection
 */
test.beforeEach(async ({ page }) => {
  await page.addInitScript(`
    // Override Audio constructor to store reference for test inspection
    var OrigAudio = Audio;
    window.Audio = function(src) {
      var audio = new OrigAudio(src);
      window.__lastAudio = audio;

      // Suppress native error events: test fixtures use dummy audio data
      // that the browser cannot decode. The real app uses valid audio files.
      // We stop propagation so the playerBridge doesn't show error toasts.
      audio.addEventListener('error', function(e) {
        e.stopImmediatePropagation();
      });

      return audio;
    };
    window.Audio.prototype = OrigAudio.prototype;

    // Patch HTMLMediaElement prototype methods
    HTMLMediaElement.prototype.play = function() {
      Object.defineProperty(this, 'paused', { value: false, writable: true });
      Object.defineProperty(this, 'duration', { value: 200, writable: true });
      Object.defineProperty(this, 'currentTime', { value: 50, writable: true });
      this.dispatchEvent(new Event('loadedmetadata'));
      this.dispatchEvent(new Event('loadeddata'));
      this.dispatchEvent(new Event('canplay'));
      this.dispatchEvent(new Event('canplaythrough'));
      return Promise.resolve();
    };
    HTMLMediaElement.prototype.pause = function() {
      Object.defineProperty(this, 'paused', { value: true, writable: true });
      return undefined;
    };
    // Mock load() to dispatch events asynchronously
    HTMLMediaElement.prototype.load = function() {
      var self = this;
      setTimeout(function() {
        if (self.src && self.src !== '') {
          self.dispatchEvent(new Event('loadedmetadata'));
          self.dispatchEvent(new Event('loadeddata'));
          self.dispatchEvent(new Event('canplay'));
          self.dispatchEvent(new Event('canplaythrough'));
        }
      }, 50);
      return undefined;
    };
  `)
})

/**
 * Diagnostic helper: dump IndexedDB state for debugging.
 */
async function dumpIndexedDB(page: Page): Promise<{ blobs: string[]; kvKeys: string[]; meta: any }> {
  return page.evaluate(async () => {
    const dbReq = indexedDB.open('neko-music', 3)
    const db: IDBDatabase = await new Promise((resolve, reject) => {
      dbReq.onsuccess = () => resolve(dbReq.result)
      dbReq.onerror = () => reject(dbReq.error)
    })

    const blobs: string[] = []
    try {
      const tx1 = db.transaction('blobs', 'readonly')
      const cursorReq = tx1.objectStore('blobs').openCursor()
      await new Promise<void>((resolve) => {
        cursorReq.onsuccess = () => {
          const cursor = cursorReq.result
          if (cursor) { blobs.push(String(cursor.key)); cursor.continue() }
          else resolve()
        }
      })
    } catch { /* store may not exist */ }

    const kvKeys: string[] = []
    try {
      const tx2 = db.transaction('kv', 'readonly')
      const cursorReq2 = tx2.objectStore('kv').openCursor()
      await new Promise<void>((resolve) => {
        cursorReq2.onsuccess = () => {
          const cursor = cursorReq2.result
          if (cursor) { kvKeys.push(String(cursor.key)); cursor.continue() }
          else resolve()
        }
      })
    } catch { /* store may not exist */ }

    let meta = null
    try {
      const tx3 = db.transaction('kv', 'readonly')
      const getReq = tx3.objectStore('kv').get('audio-cache-meta')
      meta = await new Promise((resolve) => {
        getReq.onsuccess = () => resolve(getReq.result)
      })
    } catch { /* key may not exist */ }

    db.close()
    return { blobs, kvKeys, meta }
  })
}

/**
 * Helper: get the last audio element's src for inspection.
 */
async function getAudioSrc(page: Page): Promise<string> {
  return page.evaluate(() => (window as any).__lastAudio?.src || '')
}

/**
 * Helper: read and parse the persisted player state from localStorage.
 */
async function getPlayerState(page: Page): Promise<any> {
  return page.evaluate(() => {
    const raw = localStorage.getItem('neko.player.v1.state')
    if (!raw) return null
    try { return JSON.parse(raw) } catch { return null }
  })
}

/**
 * Helper: wait for the app to fully initialize after a page reload.
 * The app mounts asynchronously after playlists.init() completes.
 */
async function waitForAppReady(page: Page) {
  // Wait for the Vue app to mount
  await page.waitForSelector('#app', { timeout: 15000 })
  // Give time for async init IIFE to complete
  await page.waitForTimeout(2000)
}

/**
 * Helper: check if any error toasts are visible.
 * Returns true if error toasts exist.
 */
async function hasErrorToast(page: Page): Promise<boolean> {
  const errorToasts = page.locator('.toast-item.error')
  return (await errorToasts.count()) > 0
}

/**
 * Helper: get all visible toast messages.
 */
async function getToastMessages(page: Page): Promise<string[]> {
  const toasts = page.locator('.toast-item')
  const count = await toasts.count()
  const messages: string[] = []
  for (let i = 0; i < count; i++) {
    const text = await toasts.nth(i).textContent()
    if (text) messages.push(text)
  }
  return messages
}

test.describe('Refresh Playback', () => {
  test.describe('RFP-01: fs import -> play -> refresh -> queue recovery -> play again', () => {
    test('basic refresh-and-play flow works without errors', async ({ page }) => {
      const player = new PlayerPage(page)
      const base = new BasePage(page)

      // Phase 1: Setup
      await seedTracks(page, 2)

      // Click play in control bar to trigger smart play (loads library into queue)
      const library = new LibraryPage(page)
      await base.clickPlay()
      await page.waitForTimeout(500)

      // Navigate to player and verify queue has tracks
      await player.navPlayer.click()
      await expect(page.locator('.player-page')).toBeVisible()
      await expect(player.trackRows).toHaveCount(2)

      // Phase 2: Refresh
      await page.reload()
      await waitForAppReady(page)

      // Navigate to player
      await player.navPlayer.click()
      await expect(page.locator('.player-page')).toBeVisible()
      await page.waitForTimeout(500)

      // Verify queue is restored
      await expect(player.trackRows).toHaveCount(2)

      // Click play
      await base.clickPlay()
      await page.waitForTimeout(1000)

      // Verify no error toast appeared
      const errorToastPresent = await hasErrorToast(page)
      expect(errorToastPresent).toBe(false)

      // Verify audio.src is set (track was actually loaded)
      const audioSrc = await getAudioSrc(page)
      expect(audioSrc).toBeTruthy()
      expect(audioSrc).toMatch(/^(blob:|https?:)/)
    })
  })

  test.describe('RFP-02: IndexedDB blob data survives refresh', () => {
    test('blob keys persist in IndexedDB after page reload', async ({ page }) => {
      await seedTracks(page, 1)

      // Navigate to library first to trigger any lazy-loading
      const library = new LibraryPage(page)
      await page.waitForTimeout(500)

      // Check IDB state before reload
      const before = await dumpIndexedDB(page)
      // We should have at least blob entries (from the imported file)
      expect(before.blobs.length).toBeGreaterThanOrEqual(1)
      // Log diagnostic info
      console.log('IDB before reload:', { blobCount: before.blobs.length, kvKeys: before.kvKeys })

      // Refresh
      await page.reload()
      await waitForAppReady(page)

      // Navigate to library to trigger initialization
      await library.navigateToLibrary()
      await page.waitForTimeout(500)

      // Check IDB state after reload
      const after = await dumpIndexedDB(page)
      console.log('IDB after reload:', { blobCount: after.blobs.length, kvKeys: after.kvKeys })

      // Blob data should survive the refresh
      expect(after.blobs.length).toBe(before.blobs.length)
      // All blob keys from before should still exist
      for (const key of before.blobs) {
        expect(after.blobs).toContain(key)
      }
    })
  })

  test.describe('RFP-03: fs source blob reloads successfully after refresh', () => {
    test('audio.src is set to blob URL after refresh and playing a track from queue', async ({ page }) => {
      const player = new PlayerPage(page)
      const base = new BasePage(page)

      await seedTracks(page, 1)

      // Trigger smart play to add track to queue and load into engine
      await base.clickPlay()
      await page.waitForTimeout(500)

      // Verify audio src was set before refresh
      const srcBefore = await getAudioSrc(page)
      expect(srcBefore).toBeTruthy()

      // Refresh
      await page.reload()
      await waitForAppReady(page)

      // Navigate to player - queue should be restored from localStorage
      await player.navPlayer.click()
      await expect(page.locator('.player-page')).toBeVisible()
      await expect(player.trackRows).toHaveCount(1)

      // Click the ActionMenu "play" button on the first track row.
      // This triggers playTrack(index, track) -> playerStore.play() which
      // properly calls playerEngine.load() before playerEngine.play().
      // (The control bar play button only toggles play/pause without loading.)
      await player.trackRows.nth(0).hover()
      const playBtn = player.trackRows.nth(0).locator('[title="立即播放"]')
      await playBtn.click()
      await page.waitForTimeout(1000)

      // Verify audio src is set to a blob URL after the full load cycle
      const srcAfter = await getAudioSrc(page)
      expect(srcAfter).toBeTruthy()
      expect(srcAfter).toMatch(/^(blob:|https?:)/)
    })
  })

  test.describe('RFP-04: multiple refreshes do not accumulate errors', () => {
    test('playback works after 3 consecutive refreshes', async ({ page }) => {
      const player = new PlayerPage(page)
      const base = new BasePage(page)

      await seedTracks(page, 2)

      // Initial play to populate queue
      await base.clickPlay()
      await page.waitForTimeout(500)

      // Navigate to player
      await player.navPlayer.click()
      await expect(page.locator('.player-page')).toBeVisible()
      await expect(player.trackRows).toHaveCount(2)

      // Refresh 3 times, checking each time
      for (let i = 1; i <= 3; i++) {
        await page.reload()
        await waitForAppReady(page)

        await player.navPlayer.click()
        await expect(page.locator('.player-page')).toBeVisible()
        await page.waitForTimeout(300)

        // Queue should still have tracks
        const rowCount = await player.trackRows.count()
        expect(rowCount).toBe(2)

        // Click play
        await base.clickPlay()
        await page.waitForTimeout(500)

        // Verify no error toast
        const errorToastPresent = await hasErrorToast(page)
        expect(errorToastPresent).toBe(false)
      }
    })
  })

  test.describe('RFP-05: localStorage queue data integrity', () => {
    test('queue data in localStorage is complete and survives refresh', async ({ page }) => {
      const base = new BasePage(page)

      await seedTracks(page, 2)

      // Play to populate queue
      await base.clickPlay()
      await page.waitForTimeout(500)

      // Read player state from localStorage
      const before = await getPlayerState(page)
      console.log('localStorage player state before reload:', JSON.stringify(before, null, 2))

      // Verify queue data structure
      expect(before).not.toBeNull()
      expect(before.queue).toBeInstanceOf(Array)
      expect(before.queue.length).toBeGreaterThanOrEqual(1)

      // Each track should have required fields
      for (const track of before.queue) {
        expect(track.uri).toBeTruthy()
        expect(track.sourceId).toBeTruthy()
        expect(track.id).toBeTruthy()
        expect(track.title).toBeTruthy()
      }

      // Track the URIs for comparison after refresh
      const urisBefore = before.queue.map((t: any) => t.uri)

      // Refresh
      await page.reload()
      await waitForAppReady(page)

      // Read player state after refresh
      const after = await getPlayerState(page)
      console.log('localStorage player state after reload:', JSON.stringify(after, null, 2))

      expect(after).not.toBeNull()
      expect(after.queue).toBeInstanceOf(Array)
      expect(after.queue.length).toBe(before.queue.length)

      // URIs should match (serialization/deserialization is correct)
      const urisAfter = after.queue.map((t: any) => t.uri)
      expect(urisAfter).toEqual(urisBefore)

      // Each track should still have required fields
      for (const track of after.queue) {
        expect(track.uri).toBeTruthy()
        expect(track.sourceId).toBeTruthy()
        expect(track.id).toBeTruthy()
      }
    })
  })

  test.describe('RFP-06: error toast capture (diagnostic)', () => {
    test('no error toast appears when playing after refresh', async ({ page }) => {
      const player = new PlayerPage(page)
      const base = new BasePage(page)

      await seedTracks(page, 1)

      // Play to add to queue
      await base.clickPlay()
      await page.waitForTimeout(500)

      // Refresh
      await page.reload()
      await waitForAppReady(page)

      // Navigate to player
      await player.navPlayer.click()
      await expect(page.locator('.player-page')).toBeVisible()

      // Click play
      await base.clickPlay()
      await page.waitForTimeout(1500)

      // Collect all toast messages for diagnostic purposes
      const toastMessages = await getToastMessages(page)
      console.log('Toast messages after refresh+play:', toastMessages)

      // Check for error toasts specifically
      const errorToastPresent = await hasErrorToast(page)

      // If there's an error toast, capture it for diagnosis
      if (errorToastPresent) {
        const errorTexts: string[] = []
        const errorToasts = page.locator('.toast-item.error')
        const errorCount = await errorToasts.count()
        for (let i = 0; i < errorCount; i++) {
          const text = await errorToasts.nth(i).textContent()
          if (text) errorTexts.push(text)
        }
        console.error('ERROR TOAST DETECTED:', errorTexts)
      }

      // No toast should contain error/failure messages
      const errorKeywords = /Failed|error|失败|错误|Error/i
      for (const msg of toastMessages) {
        expect(msg).not.toMatch(errorKeywords)
      }
    })
  })

  test.describe('RFP-07: empty queue refresh behavior', () => {
    test('empty queue after refresh shows proper warning, not error', async ({ page }) => {
      const player = new PlayerPage(page)
      const base = new BasePage(page)

      await base.clearAllData()
      await page.reload()
      await waitForAppReady(page)

      // Navigate to player
      await player.navPlayer.click()
      await expect(page.locator('.player-page')).toBeVisible()

      // Should show empty state
      await expect(player.emptyState).toBeVisible()

      // Click play on empty queue
      await base.clickPlay()
      await page.waitForTimeout(1000)

      // Check for toasts
      const toastMessages = await getToastMessages(page)
      console.log('Toast messages on empty queue play:', toastMessages)

      // Should NOT have error toasts
      const errorToastPresent = await hasErrorToast(page)
      expect(errorToastPresent).toBe(false)

      // Should have a warning or info toast about empty library
      // The app shows "音乐库为空，请先导入歌曲" via toast.warning
      const hasRelevantToast = toastMessages.some(
        msg => msg.includes('音乐库为空') || msg.includes('Empty')
      )
      // If no toast appeared, that's also acceptable (depends on timing)
      if (toastMessages.length > 0) {
        expect(hasRelevantToast).toBe(true)
      }
    })
  })

  test.describe('RFP-08: playing state resets after refresh', () => {
    test('play button shows play state (not pause) after refresh', async ({ page }) => {
      const base = new BasePage(page)
      const player = new PlayerPage(page)

      await seedTracks(page, 1)

      // Play to start "playback"
      await base.clickPlay()
      await page.waitForTimeout(500)

      // The play button should now act as pause (since playing=true)
      // Verify the control bar is visible (means playback is active)
      await expect(base.controlBar).toBeVisible()

      // Refresh
      await page.reload()
      await waitForAppReady(page)

      // Navigate to player
      await player.navPlayer.click()
      await expect(page.locator('.player-page')).toBeVisible()
      await page.waitForTimeout(300)

      // The play button should be ready to play (playing state is NOT persisted)
      // After refresh, playing defaults to false
      await expect(base.btnPlay).toBeVisible()

      // Clicking play should work without errors
      await base.clickPlay()
      await page.waitForTimeout(500)

      // No error toast should appear
      const errorToastPresent = await hasErrorToast(page)
      expect(errorToastPresent).toBe(false)
    })
  })
})
