import { describe, it, expect, vi, beforeEach } from 'vitest'
import { BilibiliClient } from '@/services/bilibiliClient'
import { clearKeyCache } from '@/utils/bilibiliSign'
import { setActivePinia, createPinia } from 'pinia'

const mockSettings = {
  bilibiliSessdata: '',
  bilibiliCsrf: '',
  bilibiliBuvid3: '',
}

vi.mock('@/store/settings', () => ({
  useSettingsStore: vi.fn(() => ({
    settings: mockSettings,
  })),
}))

const mockNavResponse = {
  code: 0,
  data: {
    wbi_img: {
      img_url: 'https://i0.hdslb.com/bfs/wbi/7cd084941338484aae1ad9425b84077c.png',
      sub_url: 'https://i0.hdslb.com/bfs/wbi/4932caff0ff746eab6f01bf08b70ac45.png',
    },
  },
}

function mockNavAndResponse(jsonResponse: any) {
  return vi.fn().mockImplementation(async (_url: string, _opts?: RequestInit) => {
    const url = typeof _url === 'string' ? _url : (_url as URL).href
    if (url.includes('/x/web-interface/nav')) {
      return { ok: true, json: async () => mockNavResponse }
    }
    return { ok: true, json: async () => jsonResponse }
  })
}

beforeEach(() => {
  setActivePinia(createPinia())
  clearKeyCache()
  vi.restoreAllMocks()
})

describe('bilibiliClient', () => {
  it('checkAuth returns true even without cookie', async () => {
    const client = new BilibiliClient()
    const result = await client.checkAuth()
    expect(result).toBe(true)
  })

  it('getVideoInfo should call view API with bvid', async () => {
    const mockVideoInfo = {
      code: 0,
      data: {
        bvid: 'BV1xx411c7mD',
        aid: 170001,
        title: 'Test Video',
        pic: 'https://example.com/pic.jpg',
        duration: 180,
        owner: { name: 'TestUser', mid: 123 },
        pages: [{ cid: 1, page: 1, part: 'Part 1', duration: 180 }],
        cid: 1,
      },
    }
    vi.stubGlobal('fetch', mockNavAndResponse(mockVideoInfo))

    const client = new BilibiliClient()
    const result = await client.getVideoInfo('BV1xx411c7mD')

    expect(result.code).toBe(0)
    expect(result.data.bvid).toBe('BV1xx411c7mD')
  })

  it('getPlayurl should call playurl API with DASH format', async () => {
    const mockPlayurl = {
      code: 0,
      data: {
        dash: {
          audio: [{ id: 30216, baseUrl: 'https://cdn.example.com/audio.m4s', backupUrl: [], bandWidth: 64000 }],
        },
        accept_description: ['Standard'],
        accept_quality: [30216],
        quality: 30216,
      },
    }
    vi.stubGlobal('fetch', mockNavAndResponse(mockPlayurl))

    const client = new BilibiliClient()
    const result = await client.getPlayurl('BV1xx411c7mD', '1')

    expect(result.code).toBe(0)
    expect(result.data.dash.audio.length).toBeGreaterThan(0)
    expect(result.data.dash.audio[0].baseUrl).toContain('cdn.example.com')
  })

  it('should throw on 403 response', async () => {
    vi.stubGlobal('fetch', vi.fn().mockImplementation(async (url: string) => {
      if (url.includes('/x/web-interface/nav')) {
        return { ok: true, json: async () => mockNavResponse }
      }
      return { ok: true, status: 403, json: async () => ({ code: -101 }) }
    }))

    const client = new BilibiliClient()
    await expect(client.getVideoInfo('BVtest')).rejects.toThrow('Cookie expired')
  })

  it('should throw on rate limit code -509', async () => {
    vi.stubGlobal('fetch', vi.fn().mockImplementation(async (url: string) => {
      if (url.includes('/x/web-interface/nav')) {
        return { ok: true, json: async () => mockNavResponse }
      }
      return { ok: true, json: async () => ({ code: -509, message: 'rate limited' }) }
    }))

    const client = new BilibiliClient()
    await expect(client.getVideoInfo('BVtest')).rejects.toThrow('rate limited')
  })

  it('should throw on video not found code -404', async () => {
    vi.stubGlobal('fetch', vi.fn().mockImplementation(async (url: string) => {
      if (url.includes('/x/web-interface/nav')) {
        return { ok: true, json: async () => mockNavResponse }
      }
      return { ok: true, json: async () => ({ code: -404, message: 'not found' }) }
    }))

    const client = new BilibiliClient()
    await expect(client.getVideoInfo('BVtest')).rejects.toThrow('Video not found')
  })

  it('should send cookies when configured', async () => {
    mockSettings.bilibiliSessdata = 'test_sessdata'
    mockSettings.bilibiliCsrf = 'test_csrf'
    mockSettings.bilibiliBuvid3 = 'test_buvid3'

    const mockVideoInfo = {
      code: 0,
      data: {
        bvid: 'BVtest',
        aid: 1,
        title: 'Test',
        pic: '',
        duration: 60,
        owner: { name: 'User', mid: 1 },
        pages: [{ cid: 1, page: 1, part: 'P1', duration: 60 }],
        cid: 1,
      },
    }

    const mockFetch = mockNavAndResponse(mockVideoInfo)
    vi.stubGlobal('fetch', mockFetch)

    const client = new BilibiliClient()
    await client.getVideoInfo('BVtest')

    // Verify the request included cookies
    const callArgs = mockFetch.mock.calls.find(
      (call: any[]) => typeof call[0] === 'string' && call[0].includes('/x/web-interface/view'),
    ) as any[] | undefined
    expect(callArgs).toBeDefined()
    const headers = callArgs![1]?.headers
    expect(headers?.Cookie).toContain('SESSDATA=test_sessdata')
    expect(headers?.Cookie).toContain('bili_jct=test_csrf')
    expect(headers?.Cookie).toContain('buvid3=test_buvid3')

    mockSettings.bilibiliSessdata = ''
    mockSettings.bilibiliCsrf = ''
    mockSettings.bilibiliBuvid3 = ''
  })
})
