import { describe, it, expect, vi, beforeEach, beforeAll } from 'vitest'

// ============ Hoisted: shared stores and mock setup before imports ============
const { kvStore, idxBlobStore, ls, mockAudioInstance, bilibiliClientMocks, neteaseClientMocks, mockSettings, toastMocks, urlMocks, fetchMock } = vi.hoisted(() => {
  const kvStore = new Map<string, any>()
  const idxBlobStore = new Map<string, Blob>()
  const ls = new Map<string, string>()

  // Audio mock instance
  const mockAudioInstance = {
    src: '',
    play: vi.fn(),
    pause: vi.fn(),
    load: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    removeAttribute: vi.fn(),
    preload: '',
    currentTime: 0,
    duration: 0,
    volume: 1,
    paused: true,
  }

  // Bilibili client mocks
  const bilibiliClientMocks = {
    getPlayurl: vi.fn(),
    getVideoInfo: vi.fn(),
    resolveShortLink: vi.fn(),
    resolveAuPage: vi.fn(),
    getAudioInfo: vi.fn(),
    getFavList: vi.fn(),
  }

  // Netease client mocks
  const neteaseClientMocks = {
    getSongUrl: vi.fn(),
    getSongDetail: vi.fn(),
    getPlaylistDetail: vi.fn(),
    getAlbum: vi.fn(),
  }

  const mockSettings = {
    settings: {
      defaultVolume: 0.8,
      playMode: 'loop' as string,
      neteaseCookie: 'mock-cookie',
      neteaseCsrf: '',
      bilibiliSessdata: 'mock-sessdata',
      bilibiliCsrf: '',
      bilibiliBuvid3: '',
    },
  }

  const toastMocks = {
    error: vi.fn(),
    success: vi.fn(),
    warning: vi.fn(),
    info: vi.fn(),
    items: [] as any[],
  }

  let blobUrlCounter = 0
  const urlMocks = {
    createObjectURL: vi.fn((_blob: Blob) => `blob:mock-${++blobUrlCounter}`),
    revokeObjectURL: vi.fn(),
  }

  const fetchMock = vi.fn(async (_url: string, _options?: any) => {
    return new Response(new Blob(['mock-audio-data'], { type: 'audio/mpeg' }), {
      status: 200,
    })
  })

  // Critical: stub Audio BEFORE any module that uses it is imported
  // Must use function() not arrow, because new Audio() needs a constructable function
  vi.stubGlobal('Audio', vi.fn(function() { return mockAudioInstance }))
  vi.stubGlobal('fetch', fetchMock)
  vi.stubGlobal('localStorage', {
    getItem: vi.fn((key: string) => ls.get(key) ?? null),
    setItem: vi.fn((key: string, val: string) => { ls.set(key, val) }),
    removeItem: vi.fn(),
  })
  vi.stubGlobal('indexedDB', {
    open: vi.fn(() => ({
      result: {
        objectStoreNames: { contains: () => true },
        transaction: vi.fn(() => ({
          objectStore: vi.fn((name: string) => {
            const s = name === 'blobs' ? idxBlobStore : kvStore
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
              openCursor: vi.fn(() => {
                const entries = Array.from(s.entries())
                let idx = 0
                let onsuccess: any = null
                const cursor = {
                  get key() { return entries[idx]?.[0] },
                  get value() { return entries[idx]?.[1] },
                  continue: vi.fn(() => { idx++; if (onsuccess) onsuccess() }),
                  delete: vi.fn(() => {
                    const key = entries[idx]?.[0]
                    if (key !== undefined) s.delete(key)
                  }),
                }
                return {
                  get result() { return idx < entries.length ? cursor : null },
                  set onsuccess(cb: any) { onsuccess = cb; cb() },
                  set onerror(_: any) {},
                }
              }),
              put: vi.fn((value: any, key?: string) => { s.set(key ?? '', value) }),
              delete: vi.fn((key: string) => { s.delete(key) }),
            }
          }),
          set oncomplete(cb: any) { Promise.resolve().then(cb) },
          set onerror(_: any) {},
        })),
      },
      set onupgradeneeded(cb: any) { cb() },
      set onsuccess(cb: any) { cb() },
      set onerror(_: any) {},
    })),
  })

  return { kvStore, idxBlobStore, ls, mockAudioInstance, bilibiliClientMocks, neteaseClientMocks, mockSettings, toastMocks, urlMocks, fetchMock }
})

// ============ vi.mock calls (hoisted automatically) ============
vi.mock('@/services/logger', () => ({
  createLogger: vi.fn(() => ({
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  })),
}))

vi.mock('music-metadata', () => ({
  parseBlob: vi.fn(async () => ({
    format: {
      sampleRate: 44100,
      bitrate: 128000,
      bitsPerSample: 16,
      numberOfChannels: 2,
      codec: 'aac',
      container: 'm4a',
      lossless: false,
    },
  })),
}))

vi.mock('@/services/bilibiliClient', () => ({
  BilibiliClient: vi.fn(function() { return bilibiliClientMocks }),
}))

vi.mock('@/services/neteaseClient', () => ({
  NeteaseClient: vi.fn(function() { return neteaseClientMocks }),
}))

vi.mock('@/store/settings', () => ({
  useSettingsStore: vi.fn(() => mockSettings),
}))

vi.mock('@/store/toast', () => ({
  useToastStore: vi.fn(() => toastMocks),
}))

// ============ URL mock static overrides ============
const OrigURL = globalThis.URL as any
OrigURL.createObjectURL = urlMocks.createObjectURL
OrigURL.revokeObjectURL = urlMocks.revokeObjectURL

// ============ Source imports (after all stubs are in place) ============
import { playerEngine } from '@/core/playerEngine'
import { UriResolver } from '@/core/uriResolver'
import { registry } from '@/adapters/registry'
import { bilibiliAdapter } from '@/adapters/bilibiliAdapter'
import { neteaseAdapter } from '@/adapters/neteaseAdapter'
import { fileSystemAdapter } from '@/adapters/fileSystemAdapter'
import { audioCache } from '@/services/audioCache'
import type { Track } from '@/models/track'

// ============ Helpers ============
function makeTrack(overrides: Partial<Track> = {}): Track {
  return {
    id: 'test-id-' + Math.random().toString(36).slice(2, 8),
    uri: 'neko://test/track/test',
    title: 'Test Track',
    sourceId: 'test',
    sourceRef: {},
    ...overrides,
  }
}

function resetAllStores() {
  kvStore.clear()
  idxBlobStore.clear()
  ls.clear()
}

describe('Playback Roundtrip', () => {
  beforeEach(() => {
    resetAllStores()
    mockAudioInstance.src = ''
  })

  // ================================================================
  // 6. Bilibili full pipeline
  // ================================================================
  describe('Bilibili full pipeline', () => {
    beforeEach(() => {
      registry.register(bilibiliAdapter)
    })

    it('6.1 load → cache → refresh → load again (cache hit, no network)', async () => {
      bilibiliClientMocks.getPlayurl.mockResolvedValue({
        code: 0,
        data: {
          dash: {
            audio: [{
              baseUrl: 'https://cdn.example.com/audio.m4a',
              bandWidth: 128000,
              mimeType: 'audio/mp4',
            }],
          },
        },
      })

      const track: Track = {
        id: 'bili-test-1',
        uri: UriResolver.generate('bilibili', 'track', 'BVtest123', { cid: '0', quality: 'standard' }),
        title: 'Test Bilibili Track',
        sourceId: 'bilibili',
        sourceRef: { type: 'video', bvid: 'BVtest123', cid: 0 },
      }

      // === Phase 1: Initial load (cache miss) ===
      await playerEngine.load(track)

      expect(bilibiliClientMocks.getPlayurl).toHaveBeenCalled()
      expect(fetchMock).toHaveBeenCalled()
      expect(mockAudioInstance.src).toMatch(/^blob:mock-/)
      const phase1Src = mockAudioInstance.src

      // Verify cached
      const cached = await audioCache.get(track.uri)
      expect(cached).toBeInstanceOf(Blob)

      // Record call counts
      const playurlCalls = bilibiliClientMocks.getPlayurl.mock.calls.length
      const fetchCalls = fetchMock.mock.calls.length

      // === Phase 2: "Refresh" — same track, should use cache ===
      await playerEngine.load(track)

      // Network must NOT be called again
      expect(bilibiliClientMocks.getPlayurl).toHaveBeenCalledTimes(playurlCalls)
      expect(fetchMock).toHaveBeenCalledTimes(fetchCalls)

      // Audio src should be a (different) blob URL
      expect(mockAudioInstance.src).toMatch(/^blob:mock-/)
      expect(mockAudioInstance.src).not.toBe(phase1Src)
      expect(urlMocks.revokeObjectURL).toHaveBeenCalledWith(phase1Src)
    })

    it('6.2 after initial load, audioCache has correct data', async () => {
      bilibiliClientMocks.getPlayurl.mockResolvedValue({
        code: 0,
        data: {
          dash: {
            audio: [{
              baseUrl: 'https://cdn.example.com/audio2.m4a',
              bandWidth: 192000,
              mimeType: 'audio/mp4',
            }],
          },
        },
      })

      const track: Track = {
        id: 'bili-test-2',
        uri: UriResolver.generate('bilibili', 'track', 'BVcache1', { cid: '1', quality: 'high' }),
        title: 'Cache Test',
        sourceId: 'bilibili',
        sourceRef: { type: 'video', bvid: 'BVcache1', cid: 1 },
      }

      await playerEngine.load(track)

      const cached = await audioCache.get(track.uri)
      expect(cached).not.toBeUndefined()
      expect(await cached!.text()).toBe('mock-audio-data')
    })
  })

  // ================================================================
  // 7. NetEase full pipeline
  // ================================================================
  describe('NetEase full pipeline', () => {
    beforeEach(() => {
      registry.register(neteaseAdapter)
    })

    it('7.1 load → cache → refresh → load again (cache hit, no network)', async () => {
      neteaseClientMocks.getSongUrl.mockResolvedValue({
        code: 200,
        data: [{ url: 'https://cdn.example.com/netease-song.mp3' }],
      })

      const track: Track = {
        id: 'ne-test-1',
        uri: UriResolver.generate('netease', 'track', '12345678', { quality: 'standard' }),
        title: 'Test NetEase Track',
        sourceId: 'netease',
        sourceRef: { type: 'song', songId: '12345678' },
      }

      // === Phase 1: Initial load ===
      await playerEngine.load(track)

      expect(neteaseClientMocks.getSongUrl).toHaveBeenCalled()
      expect(fetchMock).toHaveBeenCalled()
      expect(mockAudioInstance.src).toMatch(/^blob:mock-/)
      const phase1Src = mockAudioInstance.src

      const cached = await audioCache.get(track.uri)
      expect(cached).toBeInstanceOf(Blob)

      const getSongUrlCalls = neteaseClientMocks.getSongUrl.mock.calls.length
      const fetchCalls = fetchMock.mock.calls.length

      // === Phase 2: "Refresh" ===
      await playerEngine.load(track)

      expect(neteaseClientMocks.getSongUrl).toHaveBeenCalledTimes(getSongUrlCalls)
      expect(fetchMock).toHaveBeenCalledTimes(fetchCalls)
      expect(mockAudioInstance.src).toMatch(/^blob:mock-/)
      expect(mockAudioInstance.src).not.toBe(phase1Src)
      expect(urlMocks.revokeObjectURL).toHaveBeenCalledWith(phase1Src)
    })
  })

  // ================================================================
  // 8. FileSystem full pipeline
  // ================================================================
  describe('FileSystem full pipeline', () => {
    beforeEach(() => {
      registry.register(fileSystemAdapter)
    })

    it('8.1 fs resolve → load → refresh → load again (no audioCache.set called)', async () => {
      const blobId = 'fs-blob-test-1'
      const testFile = new Blob(['fs-audio-content'], { type: 'audio/flac' })

      // Simulate what fs adapter's resolve does: store file blob in indexedDB
      idxBlobStore.set(blobId, testFile)

      const track: Track = {
        id: blobId,
        uri: UriResolver.generate('fs', 'track', blobId, {
          name: 'test.flac',
          type: 'audio/flac',
          size: String(testFile.size),
          lastModified: String(Date.now()),
        }),
        title: 'Test FS Track',
        sourceId: 'fs',
        sourceRef: { name: 'test.flac', type: 'audio/flac', blobId },
      }

      // === Phase 1: Initial load ===
      await playerEngine.load(track)

      expect(mockAudioInstance.src).toMatch(/^blob:mock-/)
      const phase1Src = mockAudioInstance.src

      // fs tracks should NOT be in audioCache (their blobs have no 'audio:' prefix)
      const statsAfterPhase1 = await audioCache.getStats()
      expect(statsAfterPhase1.count).toBe(0)

      // === Phase 2: "Refresh" ===
      await playerEngine.load(track)

      expect(mockAudioInstance.src).toMatch(/^blob:mock-/)
      expect(mockAudioInstance.src).not.toBe(phase1Src)
      expect(urlMocks.revokeObjectURL).toHaveBeenCalledWith(phase1Src)

      const statsAfterPhase2 = await audioCache.getStats()
      expect(statsAfterPhase2.count).toBe(0)
    })
  })

  // ================================================================
  // 9. Object URL lifecycle
  // ================================================================
  describe('Object URL lifecycle', () => {
    it('9.1 loading new track revokes previous object URL', async () => {
      registry.register(bilibiliAdapter)

      bilibiliClientMocks.getPlayurl.mockResolvedValue({
        code: 0,
        data: {
          dash: {
            audio: [{
              baseUrl: 'https://cdn.example.com/audio1.m4a',
              bandWidth: 128000,
              mimeType: 'audio/mp4',
            }],
          },
        },
      })

      const track1: Track = {
        id: 'url-test-1',
        uri: UriResolver.generate('bilibili', 'track', 'BVurl1', { cid: '0', quality: 'standard' }),
        title: 'URL Test 1',
        sourceId: 'bilibili',
        sourceRef: { type: 'video', bvid: 'BVurl1', cid: 0 },
      }

      const track2: Track = {
        id: 'url-test-2',
        uri: UriResolver.generate('bilibili', 'track', 'BVurl2', { cid: '0', quality: 'standard' }),
        title: 'URL Test 2',
        sourceId: 'bilibili',
        sourceRef: { type: 'video', bvid: 'BVurl2', cid: 0 },
      }

      // Load track 1
      await playerEngine.load(track1)
      const src1 = mockAudioInstance.src
      expect(src1).toMatch(/^blob:mock-/)
      const createCallsAfterFirst = urlMocks.createObjectURL.mock.calls.length

      // Load track 2
      await playerEngine.load(track2)
      const src2 = mockAudioInstance.src
      expect(src2).toMatch(/^blob:mock-/)
      expect(src2).not.toBe(src1)
      expect(urlMocks.revokeObjectURL).toHaveBeenCalledWith(src1)
      expect(urlMocks.createObjectURL).toHaveBeenCalledTimes(createCallsAfterFirst + 1)
    })
  })

  // ================================================================
  // 10. playerEngine load edge cases
  // ================================================================
  describe('playerEngine load edge cases', () => {
    it('10.1 load handles Blob result (cache hit simulation)', async () => {
      const blob = new Blob(['cached-blob-data'], { type: 'audio/mpeg' })
      const track = makeTrack({
        uri: 'neko://test/track/blob-result',
        sourceId: 'test',
      })

      await audioCache.set(track.uri, blob, 'test')

      registry.register({
        id: 'test',
        name: 'Test',
        canResolve: () => true,
        resolve: async () => [],
        loadByUri: async () => {
          const cached = await audioCache.get(track.uri)
          if (cached) return { url: cached }
          return { url: 'https://example.com/stream' }
        },
      })

      await playerEngine.load(track)

      expect(mockAudioInstance.src).toMatch(/^blob:mock-/)
      expect(mockAudioInstance.load).toHaveBeenCalled()
    })

    it('10.2 load handles string URL result', async () => {
      const streamUrl = 'https://example.com/stream.mp3'
      const track = makeTrack({
        uri: 'neko://string-test/track/url',
        sourceId: 'string-test',
      })

      registry.register({
        id: 'string-test',
        name: 'String Test',
        canResolve: () => true,
        resolve: async () => [],
        loadByUri: async () => ({ url: streamUrl }),
      })

      const createCallsBefore = urlMocks.createObjectURL.mock.calls.length

      await playerEngine.load(track)

      expect(mockAudioInstance.src).toBe(streamUrl)
      // createObjectURL should NOT have been called (no Blob in result)
      expect(urlMocks.createObjectURL).toHaveBeenCalledTimes(createCallsBefore)
    })

    it('10.3 load handles UriResolver exception gracefully', async () => {
      const track = makeTrack({
        uri: 'neko://error/track/fail',
        sourceId: 'error',
      })

      registry.register({
        id: 'error',
        name: 'Error Test',
        canResolve: () => true,
        resolve: async () => [],
        loadByUri: async () => {
          throw new Error('Simulated adapter failure')
        },
      })

      await expect(playerEngine.load(track)).rejects.toMatchObject({
        code: 'UNKNOWN',
        stage: 'resolve',
      })
    })
  })

  // ================================================================
  // 11. Adapter cache-first logic
  // ================================================================
  describe('Adapter cache-first logic', () => {
    it('11.1 Bilibili adapter skips network on cache hit', async () => {
      registry.register(bilibiliAdapter)

      const cacheKey = UriResolver.generate('bilibili', 'track', 'BVhit1', {
        cid: '0',
        quality: 'standard',
      })
      const cachedBlob = new Blob(['pre-cached-bili'], { type: 'audio/mp4' })
      await audioCache.set(cacheKey, cachedBlob, 'bilibili')

      const playurlCallsBefore = bilibiliClientMocks.getPlayurl.mock.calls.length
      const fetchCallsBefore = fetchMock.mock.calls.length

      const result = await bilibiliAdapter.loadByUri('BVhit1', {
        cid: '0',
        quality: 'standard',
      })

      expect(result.url).toBeInstanceOf(Blob)
      expect(await (result.url as Blob).text()).toBe('pre-cached-bili')
      expect(bilibiliClientMocks.getPlayurl).toHaveBeenCalledTimes(playurlCallsBefore)
      expect(fetchMock).toHaveBeenCalledTimes(fetchCallsBefore)
    })

    it('11.2 NetEase adapter skips network on cache hit', async () => {
      registry.register(neteaseAdapter)

      const cacheKey = UriResolver.generate('netease', 'track', '98765432', {
        quality: 'standard',
      })
      const cachedBlob = new Blob(['pre-cached-ne'], { type: 'audio/mpeg' })
      await audioCache.set(cacheKey, cachedBlob, 'netease')

      const getSongUrlCallsBefore = neteaseClientMocks.getSongUrl.mock.calls.length
      const fetchCallsBefore = fetchMock.mock.calls.length

      const result = await neteaseAdapter.loadByUri('98765432', {
        quality: 'standard',
      })

      expect(result.url).toBeInstanceOf(Blob)
      expect(await (result.url as Blob).text()).toBe('pre-cached-ne')
      expect(neteaseClientMocks.getSongUrl).toHaveBeenCalledTimes(getSongUrlCallsBefore)
      expect(fetchMock).toHaveBeenCalledTimes(fetchCallsBefore)
    })

    it('11.3 Bilibili adapter fetches from network on cache miss', async () => {
      registry.register(bilibiliAdapter)

      bilibiliClientMocks.getPlayurl.mockResolvedValue({
        code: 0,
        data: {
          dash: {
            audio: [{
              baseUrl: 'https://cdn.example.com/audio-miss.m4a',
              bandWidth: 128000,
              mimeType: 'audio/mp4',
            }],
          },
        },
      })

      const result = await bilibiliAdapter.loadByUri('BVmiss1', {
        cid: '0',
        quality: 'standard',
      })

      expect(bilibiliClientMocks.getPlayurl).toHaveBeenCalled()
      expect(fetchMock).toHaveBeenCalled()
      expect(result.url).toBeInstanceOf(Blob)
    })
  })

  // ================================================================
  // 12. Self-healing in full pipeline
  // ================================================================
  describe('Self-healing in full pipeline', () => {
    it('12.1 metadata lost but blob exists — adapter still retrieves cached blob', async () => {
      registry.register(bilibiliAdapter)

      const cacheKey = UriResolver.generate('bilibili', 'track', 'BVheal1', {
        cid: '0',
        quality: 'standard',
      })

      // Simulate: blob stored but metadata lost
      const savedBlob = new Blob(['heal-me-data'], { type: 'audio/mp4' })
      idxBlobStore.set('audio:' + cacheKey, savedBlob)

      const playurlCallsBefore = bilibiliClientMocks.getPlayurl.mock.calls.length
      const fetchCallsBefore = fetchMock.mock.calls.length

      const result = await bilibiliAdapter.loadByUri('BVheal1', {
        cid: '0',
        quality: 'standard',
      })

      expect(result.url).toBeInstanceOf(Blob)
      expect(await (result.url as Blob).text()).toBe('heal-me-data')
      expect(bilibiliClientMocks.getPlayurl).toHaveBeenCalledTimes(playurlCallsBefore)
      expect(fetchMock).toHaveBeenCalledTimes(fetchCallsBefore)

      const stats = await audioCache.getStats()
      expect(stats.count).toBe(1)
    })
  })
})
