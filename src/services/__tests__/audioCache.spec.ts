import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// ============ In-memory stores ============
const dbBlobStore = new Map<string, Blob>()
const kvStore = new Map<string, any>()

// ============ Mock @/services/db (blob operations) ============
vi.mock('@/services/db', () => ({
  setBlob: vi.fn(async (key: string, blob: Blob) => { dbBlobStore.set(key, blob) }),
  getBlob: vi.fn(async (key: string): Promise<Blob | undefined> => dbBlobStore.get(key)),
  deleteBlob: vi.fn(async (key: string) => { dbBlobStore.delete(key) }),
  getBlobStatsByPrefix: vi.fn(async (prefix: string): Promise<{ count: number; size: number }> => {
    let count = 0
    let size = 0
    dbBlobStore.forEach((b, key) => {
      if (key.startsWith(prefix)) { count++; size += b.size }
    })
    return { count, size }
  }),
  clearBlobsByPrefix: vi.fn(async (prefix: string) => {
    for (const key of dbBlobStore.keys()) {
      if (key.startsWith(prefix)) dbBlobStore.delete(key)
    }
  }),
  setLibrary: vi.fn(async () => {}),
  getLibrary: vi.fn(async () => undefined),
  setPlaylists: vi.fn(async () => {}),
  getPlaylists: vi.fn(async () => undefined),
  setCurrentPlaylistId: vi.fn(async () => {}),
  getCurrentPlaylistId: vi.fn(async () => undefined),
}))

// ============ Mock logger ============
vi.mock('@/services/logger', () => ({
  createLogger: vi.fn(() => ({
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  })),
}))

// ============ Mock IndexedDB globally (for audioCache's internal metadata) ============
vi.stubGlobal('indexedDB', {
  open: vi.fn().mockReturnValue({
    result: {
      objectStoreNames: { contains: () => true },
      transaction: vi.fn().mockReturnValue({
        objectStore: vi.fn((name: string) => {
          const s = name === 'blobs' ? dbBlobStore : kvStore
          return {
            get: vi.fn((key: string) => ({
              get result() { return s.get(key) },
              set onsuccess(cb: any) { cb() },
              set onerror(_: any) {},
            })),
            getAll: vi.fn(() => ({
              get result() { return Array.from(s.values()) },
              set onsuccess(cb: any) { cb() },
              set onerror(_: any) {},
            })),
            put: vi.fn((value: any, key?: string) => { s.set(key ?? '', value) }),
            delete: vi.fn((key: string) => { s.delete(key) }),
            clear: vi.fn(() => { s.clear() }),
          }
        }),
        set oncomplete(cb: any) { Promise.resolve().then(cb) },
        set onerror(_: any) {},
      }),
    },
    set onupgradeneeded(cb: any) { cb() },
    set onsuccess(cb: any) { cb() },
    set onerror(_: any) {},
  }),
})

import { audioCache } from '@/services/audioCache'

// ============ Helpers ============
function makeBlob(content: string = 'test', type: string = 'audio/mpeg'): Blob {
  return new Blob([content], { type })
}

const CACHE_PREFIX = 'audio:'
const META_KEY = 'audio-cache-meta'

describe('audioCache', () => {
  beforeEach(() => {
    kvStore.clear()
    dbBlobStore.clear()
    // Keep the IndexedDB mock implementations installed at module scope.
    // restoreAllMocks() resets those implementations in Vitest 2/3, causing
    // metadata writes to complete without touching the in-memory store.
    vi.clearAllMocks()
  })

  // ================================================================
  // 1. Basic set/get consistency
  // ================================================================
  describe('basic set/get', () => {
    it('1.1 set() then get() returns same blob data', async () => {
      const blob = makeBlob('hello audio data')
      await audioCache.set('neko://test/track/1', blob, 'test')

      const result = await audioCache.get('neko://test/track/1')
      expect(result).toBeInstanceOf(Blob)
      expect(await result!.text()).toBe('hello audio data')
      expect(result!.type).toBe('audio/mpeg')
      expect(result!.size).toBe(blob.size)
    })

    it('1.2 get() for unknown URI returns undefined', async () => {
      const result = await audioCache.get('neko://test/track/nonexistent')
      expect(result).toBeUndefined()
    })

    it('1.3 same key set() twice, metadata updates (count still 1)', async () => {
      const blob1 = makeBlob('data1')
      const blob2 = makeBlob('data2-longer')

      await audioCache.set('neko://test/track/dup', blob1, 'test')
      await audioCache.set('neko://test/track/dup', blob2, 'test')

      const stats = await audioCache.getStats()
      expect(stats.count).toBe(1)
      expect(stats.size).toBe(blob2.size)

      const result = await audioCache.get('neko://test/track/dup')
      expect(await result!.text()).toBe('data2-longer')
    })

    it('1.4 getStats() returns correct count and totalSize', async () => {
      const b1 = makeBlob('a')
      const b2 = makeBlob('bb')

      await audioCache.set('neko://a/track/1', b1, 'a')
      await audioCache.set('neko://b/track/2', b2, 'b')

      const stats = await audioCache.getStats()
      expect(stats.count).toBe(2)
      expect(stats.size).toBe(b1.size + b2.size)
    })
  })

  // ================================================================
  // 2. Self-healing
  // ================================================================
  describe('self-healing', () => {
    it('2.1 metadata lost but blob exists — auto-recover', async () => {
      const blob = makeBlob('recover-me')
      const uri = 'neko://test/track/recover'
      const key = CACHE_PREFIX + uri

      // Simulate: setBlob succeeded but saveMeta failed
      dbBlobStore.set(key, blob)
      // kvStore has NO metadata entry

      const result = await audioCache.get(uri)
      expect(result).toBeInstanceOf(Blob)
      expect(await result!.text()).toBe('recover-me')

      // Metadata should be restored
      const stats = await audioCache.getStats()
      expect(stats.count).toBe(1)

      // Verify metadata was persisted to kvStore
      const meta = kvStore.get(META_KEY)
      expect(meta.entries[key]).toBeDefined()
      expect(meta.entries[key].size).toBe(blob.size)
    })

    it('2.2 self-healing: blob also missing — returns undefined', async () => {
      // Neither metadata in kvStore nor blob in dbBlobStore
      const result = await audioCache.get('neko://test/track/ghost')
      expect(result).toBeUndefined()
    })

    it('2.3 self-healing: subsequent get() works after recovery', async () => {
      const blob = makeBlob('persistent')
      const uri = 'neko://test/track/persist'
      const key = CACHE_PREFIX + uri

      // Orphan blob, no metadata
      dbBlobStore.set(key, blob)

      const r1 = await audioCache.get(uri)
      const r2 = await audioCache.get(uri)

      expect(await r1!.text()).toBe('persistent')
      expect(await r2!.text()).toBe('persistent')
    })
  })

  // ================================================================
  // 3. TTL expiration
  // ================================================================
  describe('TTL expiration', () => {
    it('3.1 non-fs entry past 7-day TTL returns undefined', async () => {
      const now = Date.now()
      const dateSpy = vi.spyOn(Date, 'now')

      // Set entry at "now"
      dateSpy.mockReturnValue(now)
      await audioCache.set('neko://test/track/expire', makeBlob('expired'), 'test')

      // Verify it exists
      dateSpy.mockReturnValue(now + 1000)
      let result = await audioCache.get('neko://test/track/expire')
      expect(result).not.toBeUndefined()

      // Advance past 7-day TTL
      dateSpy.mockReturnValue(now + 8 * 24 * 60 * 60 * 1000)
      result = await audioCache.get('neko://test/track/expire')
      expect(result).toBeUndefined()

      // Verify blob was cleaned up
      const key = CACHE_PREFIX + 'neko://test/track/expire'
      expect(dbBlobStore.has(key)).toBe(false)

      dateSpy.mockRestore()
    })

    it('3.2 fs sourceId entry never expires (30 days still valid)', async () => {
      const now = Date.now()
      const dateSpy = vi.spyOn(Date, 'now')

      dateSpy.mockReturnValue(now)
      const blob = makeBlob('fs-data')
      await audioCache.set('neko://fs/track/perm', blob, 'fs')

      // 30 days later — should still be valid
      dateSpy.mockReturnValue(now + 30 * 24 * 60 * 60 * 1000)
      const result = await audioCache.get('neko://fs/track/perm')
      expect(result).toBeInstanceOf(Blob)
      expect(await result!.text()).toBe('fs-data')

      dateSpy.mockRestore()
    })
  })

  // ================================================================
  // 4. LRU eviction and cleanup
  // ================================================================
  describe('LRU eviction and cleanup', () => {
    it('4.1 LRU evict: exceeds MAX_ENTRIES (100) removes oldest entry', async () => {
      const now = Date.now()
      const dateSpy = vi.spyOn(Date, 'now')

      // Create 100 entries with sequential lastAccess
      for (let i = 0; i < 100; i++) {
        dateSpy.mockReturnValue(now + i * 1000)
        await audioCache.set(`neko://test/track/${i}`, makeBlob(`data-${i}`), 'test')
      }

      // Set one more — triggers eviction (count would be 101)
      dateSpy.mockReturnValue(now + 101 * 1000)
      await audioCache.set('neko://test/track/overflow', makeBlob('overflow'), 'test')

      const stats = await audioCache.getStats()
      expect(stats.count).toBeLessThanOrEqual(100)

      // The oldest entry (i=0) should have been evicted
      const oldest = await audioCache.get('neko://test/track/0')
      expect(oldest).toBeUndefined()

      // The newest entries should remain
      const newest = await audioCache.get('neko://test/track/overflow')
      expect(newest).toBeInstanceOf(Blob)
      expect(await newest!.text()).toBe('overflow')

      dateSpy.mockRestore()
    })

    it('4.2 LRU evict: exceeds MAX_TOTAL_SIZE (500MB)', async () => {
      // Pre-populate metadata directly so totalSize is near the limit
      const now = Date.now()
      const entries: Record<string, any> = {}

      for (let i = 0; i < 6; i++) {
        const key = CACHE_PREFIX + `neko://test/track/big-${i}`
        entries[key] = {
          size: 100 * 1024 * 1024, // 100MB each
          cachedAt: now - (6 - i) * 1000,
          lastAccess: now - (6 - i) * 1000,
          sourceId: 'test',
        }
        dbBlobStore.set(key, makeBlob(`big-${i}`))
      }

      // 6 entries × 100MB = 600MB > 500MB limit
      kvStore.set(META_KEY, { entries, totalSize: 600 * 1024 * 1024 })

      // Setting one more entry triggers eviction in evictIfNeeded
      // The set() call loads the pre-populated meta and adds another entry
      const dateSpy = vi.spyOn(Date, 'now')
      dateSpy.mockReturnValue(now + 10000)

      await audioCache.set('neko://test/track/trigger', makeBlob('trigger'), 'test')

      const stats = await audioCache.getStats()
      expect(stats.size).toBeLessThanOrEqual(500 * 1024 * 1024)

      dateSpy.mockRestore()
    })

    it('4.3 remove() cleans blob and metadata', async () => {
      const uri = 'neko://test/track/toremove'
      await audioCache.set(uri, makeBlob('remove-me'), 'test')

      // Verify it exists
      expect(await audioCache.get(uri)).toBeInstanceOf(Blob)

      await audioCache.remove(uri)

      // Both blob and metadata should be gone
      expect(await audioCache.get(uri)).toBeUndefined()

      const stats = await audioCache.getStats()
      expect(stats.count).toBe(0)
      expect(stats.size).toBe(0)
    })

    it('4.4 clear() removes everything', async () => {
      await audioCache.set('neko://a/track/1', makeBlob('a'), 'a')
      await audioCache.set('neko://b/track/2', makeBlob('b'), 'b')
      await audioCache.set('neko://c/track/3', makeBlob('c'), 'c')

      await audioCache.clear()

      const stats = await audioCache.getStats()
      expect(stats.count).toBe(0)
      expect(stats.size).toBe(0)

      // All blobs should be removed
      expect(dbBlobStore.size).toBe(0)
    })
  })
})
