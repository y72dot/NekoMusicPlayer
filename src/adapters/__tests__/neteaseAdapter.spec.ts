import { describe, it, expect, vi, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { neteaseAdapter } from '@/adapters/neteaseAdapter'

const { mockWeapi } = vi.hoisted(() => ({ mockWeapi: vi.fn() }))

const mockSettings = {
  defaultVolume: 0.8,
  playMode: 'loop' as const,
  neteaseCookie: 'test_cookie',
  neteaseCsrf: 'test_csrf',
}

vi.mock('@/store/settings', () => ({
  useSettingsStore: vi.fn(() => ({
    settings: mockSettings,
  })),
}))

vi.mock('@/services/neteaseClient', () => ({
  NeteaseClient: class {
    getSongDetail(ids: string[]) {
      return mockWeapi('getSongDetail', ids)
    }
    getSongUrl(id: string, quality: string) {
      return mockWeapi('getSongUrl', id, quality)
    }
    getPlaylistDetail(id: string) {
      return mockWeapi('getPlaylistDetail', id)
    }
    getAlbum(id: string) {
      return mockWeapi('getAlbum', id)
    }
  },
}))

vi.mock('@/utils/neteaseCrypto', () => ({
  sign: vi.fn((body) => ({
    params: `enc_${JSON.stringify(body)}`,
    encSecKey: 'b'.repeat(256),
  })),
}))

function mockSong(id: number, name: string) {
  return {
    id,
    name,
    ar: [{ id: 1, name: 'Test Artist' }],
    al: { id: 1, name: 'Test Album', picUrl: 'https://p1.music.126.net/cover.jpg' },
    dt: 240000,
  }
}

describe('NeteaseAdapter', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('Network is disabled in unit tests')))
    mockSettings.neteaseCookie = 'test_cookie'
    mockSettings.neteaseCsrf = 'test_csrf'
  })

  it('should have correct id and name', () => {
    expect(neteaseAdapter.id).toBe('netease')
    expect(neteaseAdapter.name).toBe('NetEase Cloud Music')
  })

  describe('canResolve', () => {
    it('should recognize music.163.com song URLs', () => {
      expect(neteaseAdapter.canResolve('https://music.163.com/#/song?id=12345678')).toBe(true)
    })

    it('should recognize music.163.com playlist URLs', () => {
      expect(neteaseAdapter.canResolve('https://music.163.com/#/playlist?id=12345678')).toBe(true)
    })

    it('should recognize music.163.com album URLs', () => {
      expect(neteaseAdapter.canResolve('https://music.163.com/#/album?id=12345678')).toBe(true)
    })

    it('should recognize pure numeric IDs', () => {
      expect(neteaseAdapter.canResolve('12345678')).toBe(true)
    })

    it('should reject short numbers', () => {
      expect(neteaseAdapter.canResolve('123')).toBe(false)
    })

    it('should reject non-netease URLs', () => {
      expect(neteaseAdapter.canResolve('https://example.com/song.mp3')).toBe(false)
    })

    it('should reject non-string values', () => {
      expect(neteaseAdapter.canResolve(12345)).toBe(false)
      expect(neteaseAdapter.canResolve(null)).toBe(false)
      expect(neteaseAdapter.canResolve({})).toBe(false)
    })

    it('should handle arrays of netease URLs', () => {
      expect(neteaseAdapter.canResolve([
        'https://music.163.com/#/song?id=1',
        'https://music.163.com/#/song?id=2',
      ])).toBe(true)
    })

    it('should reject mixed arrays', () => {
      expect(neteaseAdapter.canResolve([
        'https://music.163.com/#/song?id=1',
        'https://example.com/song.mp3',
      ])).toBe(false)
    })

    it('should reject empty arrays', () => {
      expect(neteaseAdapter.canResolve([])).toBe(false)
    })
  })

  describe('resolve', () => {
    it('should throw if cookie is not configured', async () => {
      mockSettings.neteaseCookie = ''
      await expect(
        neteaseAdapter.resolve('https://music.163.com/#/song?id=123'),
      ).rejects.toThrow('Cookie')
    })

    it('should resolve a song URL to a Track', async () => {
      mockWeapi.mockResolvedValueOnce({
        code: 200,
        songs: [mockSong(12345678, 'Test Song')],
      })

      const tracks = await neteaseAdapter.resolve(
        'https://music.163.com/#/song?id=12345678',
      )

      expect(tracks).toHaveLength(1)
      expect(tracks[0].title).toBe('Test Song')
      expect(tracks[0].artist).toBe('Test Artist')
      expect(tracks[0].album).toBe('Test Album')
      expect(tracks[0].sourceId).toBe('netease')
      expect(tracks[0].uri).toContain('neko://netease/track/12345678')
      expect(tracks[0].duration).toBe(240)
    })

    it('should resolve a numeric ID as a song', async () => {
      mockWeapi.mockResolvedValueOnce({
        code: 200,
        songs: [mockSong(52525252, 'ID Song')],
      })

      const tracks = await neteaseAdapter.resolve('52525252')
      expect(tracks).toHaveLength(1)
      expect(tracks[0].title).toBe('ID Song')
    })

    it('should throw when song is not found', async () => {
      mockWeapi.mockResolvedValueOnce({ code: 404, songs: [] })

      await expect(
        neteaseAdapter.resolve('https://music.163.com/#/song?id=999999'),
      ).rejects.toThrow('not found')
    })

    it('should throw on unparseable input', async () => {
      await expect(
        neteaseAdapter.resolve('not a valid netease input'),
      ).rejects.toThrow('Cannot parse')
    })

    it('should resolve a playlist URL', async () => {
      mockWeapi.mockResolvedValueOnce({
        code: 200,
        playlist: {
          id: 123,
          name: 'Test Playlist',
          trackIds: [{ id: 1 }, { id: 2 }],
          tracks: [mockSong(1, 'Song 1'), mockSong(2, 'Song 2')],
        },
      })

      const tracks = await neteaseAdapter.resolve(
        'https://music.163.com/#/playlist?id=123',
      )
      expect(tracks).toHaveLength(2)
      expect(tracks[0].title).toBe('Song 1')
      expect(tracks[1].title).toBe('Song 2')
    })

    it('should resolve an album URL', async () => {
      mockWeapi.mockResolvedValueOnce({
        code: 200,
        album: { id: 456, name: 'Test Album' },
        songs: [mockSong(10, 'Album Track 1')],
      })

      const tracks = await neteaseAdapter.resolve(
        'https://music.163.com/#/album?id=456',
      )
      expect(tracks).toHaveLength(1)
      expect(tracks[0].title).toBe('Album Track 1')
    })

    it('should batch-fetch missing playlist songs', async () => {
      const allTrackIds = Array.from({ length: 1200 }, (_, i) => ({ id: i + 1 }))
      const firstBatch = Array.from({ length: 1000 }, (_, i) => mockSong(i + 1, `Song ${i + 1}`))

      mockWeapi
        .mockResolvedValueOnce({
          code: 200,
          playlist: {
            id: 456,
            name: 'Big Playlist',
            trackIds: allTrackIds,
            tracks: firstBatch,
          },
        })
        .mockResolvedValueOnce({
          code: 200,
          songs: Array.from({ length: 200 }, (_, i) =>
            mockSong(i + 1001, `Song ${i + 1001}`),
          ),
        })

      const tracks = await neteaseAdapter.resolve(
        'https://music.163.com/#/playlist?id=456',
      )
      expect(tracks).toHaveLength(1200)
    })
  })

  describe('loadByUri', () => {
    it('should return a playable URL', async () => {
      mockWeapi.mockResolvedValueOnce({
        code: 200,
        data: [{ id: 123, url: 'https://m8.music.126.net/stream.mp3', br: 320000, size: 10000000, type: 'mp3' }],
      })

      const result = await neteaseAdapter.loadByUri('12345678', { quality: 'standard' })
      expect(result.url).toBe('https://m8.music.126.net/stream.mp3')
    })

    it('upgrades NetEase HTTP media URLs on an HTTPS application', async () => {
      mockWeapi.mockResolvedValueOnce({
        code: 200,
        data: [{ id: 123, url: 'http://m10.music.126.net/stream.mp3?token=test', br: 320000, size: 10000000, type: 'mp3' }],
      })

      const result = await neteaseAdapter.loadByUri('12345678', { quality: 'standard' })

      expect(fetch).toHaveBeenCalledWith('https://m10.music.126.net/stream.mp3?token=test')
      expect(result.url).toBe('https://m10.music.126.net/stream.mp3?token=test')
    })

    it('should throw when URL is null (copyright)', async () => {
      mockWeapi.mockResolvedValueOnce({
        code: 200,
        data: [{ id: 123, url: null, br: 0, size: 0, type: 'mp3' }],
      })

      await expect(
        neteaseAdapter.loadByUri('123', { quality: 'standard' }),
      ).rejects.toThrow('copyright')
    })

    it('should throw when no data', async () => {
      mockWeapi.mockResolvedValueOnce({ code: 200, data: [] })

      await expect(
        neteaseAdapter.loadByUri('123', { quality: 'standard' }),
      ).rejects.toThrow('Failed to get')
    })

    it('should throw when cookie not configured', async () => {
      mockSettings.neteaseCookie = ''
      await expect(
        neteaseAdapter.loadByUri('123', { quality: 'standard' }),
      ).rejects.toThrow('Cookie')
    })
  })
})
