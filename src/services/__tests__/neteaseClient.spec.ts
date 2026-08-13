import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NeteaseClient } from '@/services/neteaseClient'
import { setActivePinia, createPinia } from 'pinia'

vi.mock('@/utils/neteaseCrypto', () => ({
  sign: vi.fn((body) => ({
    params: `encrypted_${JSON.stringify(body)}`,
    encSecKey: 'a'.repeat(256),
  })),
}))

const mockSettings = {
  neteaseCookie: 'test_cookie_value',
  neteaseCsrf: 'test_csrf_token',
}

vi.mock('@/store/settings', () => ({
  useSettingsStore: vi.fn(() => ({
    settings: mockSettings,
  })),
}))

describe('NeteaseClient', () => {
  let client: NeteaseClient

  beforeEach(() => {
    setActivePinia(createPinia())
    client = new NeteaseClient()
    vi.restoreAllMocks()
    mockSettings.neteaseCookie = 'test_cookie_value'
    mockSettings.neteaseCsrf = 'test_csrf_token'
  })

  describe('checkAuth', () => {
    it('should return true when cookie is configured', async () => {
      mockSettings.neteaseCookie = 'test_cookie'
      const result = await client.checkAuth()
      expect(result).toBe(true)
    })

    it('should return false when cookie is empty', async () => {
      mockSettings.neteaseCookie = ''
      const result = await client.checkAuth()
      expect(result).toBe(false)
    })
  })

  describe('weapi requests', () => {
    it('should POST to correct endpoint and return JSON', async () => {
      const mockResponse = { code: 200, songs: [{ id: 123, name: 'Test Song' }] }
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve(mockResponse),
      })

      const result = await client.getSongDetail(['123'])

      expect(result).toEqual(mockResponse)
      expect(globalThis.fetch).toHaveBeenCalledTimes(1)

      const callArgs = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0]
      const url = callArgs[0] as string
      expect(url).toContain('/api/netease/weapi/v3/song/detail')
      expect(url).toContain('csrf_token=')
      expect(callArgs[1]?.headers?.['X-Neko-Upstream-Cookie']).toContain('MUSIC_U=')
    })

    it('should handle non-200 API codes gracefully (pass through)', async () => {
      const mockResponse = { code: 404, message: 'not found' }
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve(mockResponse),
      })

      const result = await client.getSongDetail(['99999999'])
      expect(result.code).toBe(404)
    })

    it('should throw on HTTP 403', async () => {
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 403,
        statusText: 'Forbidden',
      })

      await expect(client.getSongDetail(['123'])).rejects.toThrow()
    })

    it('should throw on HTTP 301', async () => {
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 301,
        statusText: 'Moved Permanently',
      })

      await expect(client.getSongDetail(['123'])).rejects.toThrow('Cookie expired')
    })

    it('should throw on timeout', async () => {
      globalThis.fetch = vi.fn().mockRejectedValue(
        new DOMException('The operation was aborted', 'AbortError')
      )

      await expect(client.getSongDetail(['123'])).rejects.toThrow('timed out')
    })
  })

  describe('getSongUrl', () => {
    it('should request song URL with quality', async () => {
      const mockResponse = {
        code: 200,
        data: [{ id: 123, url: 'https://music.126.net/stream.mp3', br: 320000, size: 10000000, type: 'mp3' }],
      }
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve(mockResponse),
      })

      const result = await client.getSongUrl('123', 'standard')
      expect(result.data[0].url).toBe('https://music.126.net/stream.mp3')
    })
  })

  describe('getPlaylistDetail', () => {
    it('should request playlist detail', async () => {
      const mockResponse = {
        code: 200,
        playlist: { id: 123, name: 'Test', trackIds: [], tracks: [] },
      }
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve(mockResponse),
      })

      const result = await client.getPlaylistDetail('123')
      expect(result.playlist.name).toBe('Test')
    })
  })

  describe('getAlbum', () => {
    it('should request album detail', async () => {
      const mockResponse = {
        code: 200,
        album: { id: 456, name: 'Test Album' },
        songs: [{ id: 1, name: 'Track 1', ar: [], al: { id: 456, name: 'Album', picUrl: '' }, dt: 200000 }],
      }
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve(mockResponse),
      })

      const result = await client.getAlbum('456')
      expect(result.album.name).toBe('Test Album')
      expect(result.songs).toHaveLength(1)
    })
  })

  describe('search', () => {
    it('should search songs', async () => {
      const mockResponse = {
        code: 200,
        result: { songCount: 1, songs: [] },
      }
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve(mockResponse),
      })

      const result = await client.search('hello', 1, 10)
      expect(result.result.songCount).toBe(1)
    })
  })
})
