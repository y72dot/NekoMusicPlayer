import { describe, it, expect, vi, beforeEach } from 'vitest'
import { wbiSign, clearKeyCache } from '@/utils/bilibiliSign'

const mockNavResponse = {
  code: 0,
  data: {
    wbi_img: {
      img_url: 'https://i0.hdslb.com/bfs/wbi/7cd084941338484aae1ad9425b84077c.png',
      sub_url: 'https://i0.hdslb.com/bfs/wbi/4932caff0ff746eab6f01bf08b70ac45.png',
    },
  },
}

function mockNavFetch() {
  return vi.fn().mockResolvedValue({
    ok: true,
    json: async () => mockNavResponse,
  })
}

beforeEach(() => {
  clearKeyCache()
  vi.restoreAllMocks()
})

describe('bilibiliSign', () => {
  it('should sign params with w_rid and wts', async () => {
    vi.stubGlobal('fetch', mockNavFetch())

    const signed = await wbiSign({ bvid: 'BV1xx411c7mD', cid: '12345' })

    expect(signed).toHaveProperty('bvid')
    expect(signed).toHaveProperty('cid')
    expect(signed).toHaveProperty('wts')
    expect(signed).toHaveProperty('w_rid')
    expect(typeof signed.wts).toBe('string')
    expect(typeof signed.w_rid).toBe('string')
    expect(signed.w_rid.length).toBe(32) // MD5 hex
    expect(/^\d+$/.test(signed.wts)).toBe(true)
  })

  it('should filter out undefined and null values', async () => {
    vi.stubGlobal('fetch', mockNavFetch())

    const signed = await wbiSign({ a: '1', b: undefined as unknown as string, c: null as unknown as string })

    expect(signed).toHaveProperty('a', '1')
    expect(signed).not.toHaveProperty('b')
    expect(signed).not.toHaveProperty('c')
  })

  it('should produce different w_rid for different params', async () => {
    vi.stubGlobal('fetch', mockNavFetch())

    const s1 = await wbiSign({ bvid: 'BV1xx411c7mD' })
    const s2 = await wbiSign({ bvid: 'BV1xx411c7mE' })

    expect(s1.w_rid).not.toBe(s2.w_rid)
  })

  it('should reuse cached keys within 30 minutes', async () => {
    const mockFetch = mockNavFetch()
    vi.stubGlobal('fetch', mockFetch)

    await wbiSign({ bvid: 'test1' })
    await wbiSign({ bvid: 'test2' })

    // Should only have called nav API once
    expect(mockFetch).toHaveBeenCalledTimes(1)
  })

  it('should handle nav API error', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
    }))

    await expect(wbiSign({ bvid: 'test' })).rejects.toThrow('Failed to fetch Wbi keys')
  })

  it('should handle nav API with non-zero code (unauthenticated)', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        code: -101,
        message: 'not logged in',
        data: {
          wbi_img: {
            img_url: 'https://i0.hdslb.com/bfs/wbi/7cd084941338484aae1ad9425b84077c.png',
            sub_url: 'https://i0.hdslb.com/bfs/wbi/4932caff0ff746eab6f01bf08b70ac45.png',
          },
        },
      }),
    }))

    const signed = await wbiSign({ bvid: 'test' })
    expect(signed).toHaveProperty('w_rid')
    expect(signed.w_rid.length).toBe(32)
  })

  it('should handle nav API code non-zero without wbi_img', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ code: -101, message: 'not logged in', data: null }),
    }))

    await expect(wbiSign({ bvid: 'test' })).rejects.toThrow('Failed to get Wbi keys')
  })

  it('should convert number values to strings', async () => {
    vi.stubGlobal('fetch', mockNavFetch())

    const signed = await wbiSign({ page: 1, type: 2 })

    expect(signed.page).toBe('1')
    expect(signed.type).toBe('2')
  })

  it('should generate valid MD5 w_rid', async () => {
    vi.stubGlobal('fetch', mockNavFetch())

    const signed = await wbiSign({ bvid: 'BV1xx411c7mD' })

    expect(/^[0-9a-f]{32}$/.test(signed.w_rid)).toBe(true)
  })
})
