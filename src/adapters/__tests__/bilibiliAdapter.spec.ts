import { describe, it, expect, vi, beforeEach } from 'vitest'
import { bilibiliAdapter } from '@/adapters/bilibiliAdapter'
import { clearKeyCache } from '@/utils/bilibiliSign'

const mockNavResponse = {
  code: 0,
  data: {
    wbi_img: {
      img_url: 'https://i0.hdslb.com/bfs/wbi/7cd084941338484aae1ad9425b84077c.png',
      sub_url: 'https://i0.hdslb.com/bfs/wbi/4932caff0ff746eab6f01bf08b70ac45.png',
    },
  },
}

beforeEach(() => {
  clearKeyCache()
  vi.restoreAllMocks()
})

describe('bilibiliAdapter', () => {
  describe('id and name', () => {
    it('should have correct id', () => {
      expect(bilibiliAdapter.id).toBe('bilibili')
    })

    it('should have correct name', () => {
      expect(bilibiliAdapter.name).toBe('Bilibili')
    })
  })

  describe('canResolve', () => {
    it('should accept BV IDs', () => {
      expect(bilibiliAdapter.canResolve('BV1xx411c7mD')).toBe(true)
    })

    it('should accept AV IDs', () => {
      expect(bilibiliAdapter.canResolve('av170001')).toBe(true)
    })

    it('should accept AU IDs', () => {
      expect(bilibiliAdapter.canResolve('au12345')).toBe(true)
    })

    it('should accept bilibili.com/video URLs', () => {
      expect(bilibiliAdapter.canResolve('https://www.bilibili.com/video/BV1xx411c7mD')).toBe(true)
    })

    it('should accept b23.tv short links', () => {
      expect(bilibiliAdapter.canResolve('https://b23.tv/abc123')).toBe(true)
    })

    it('should accept audio AU URLs', () => {
      expect(bilibiliAdapter.canResolve('https://www.bilibili.com/audio/au12345')).toBe(true)
    })

    it('should accept favlist URLs', () => {
      expect(bilibiliAdapter.canResolve('https://space.bilibili.com/123/favlist?fid=456')).toBe(true)
    })

    it('should accept array of Bilibili inputs', () => {
      expect(bilibiliAdapter.canResolve(['BV1xx411c7mD', 'av170001'])).toBe(true)
    })

    it('should reject non-bilibili inputs', () => {
      expect(bilibiliAdapter.canResolve('https://music.163.com/song?id=123456')).toBe(false)
      expect(bilibiliAdapter.canResolve('not a url')).toBe(false)
    })

    it('should reject non-string inputs', () => {
      expect(bilibiliAdapter.canResolve(123)).toBe(false)
      expect(bilibiliAdapter.canResolve(null)).toBe(false)
      expect(bilibiliAdapter.canResolve(undefined)).toBe(false)
    })

    it('should reject mixed arrays', () => {
      expect(bilibiliAdapter.canResolve(['BV1xx411c7mD', 123] as any)).toBe(false)
    })
  })
})
