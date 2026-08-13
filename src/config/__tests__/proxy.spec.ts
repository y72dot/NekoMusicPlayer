import { describe, expect, it } from 'vitest'
import { isAllowedBilibiliCdnHost, toBilibiliCdnProxyUrl } from '@/config/proxy'

describe('production proxy policy', () => {
  it('allows known Bilibili media and image subdomains', () => {
    expect(isAllowedBilibiliCdnHost('upos-sz-mirrorcos.bilivideo.com')).toBe(true)
    expect(isAllowedBilibiliCdnHost('i0.hdslb.com')).toBe(true)
  })

  it('rejects parent domains, lookalikes, IPs and local targets', () => {
    expect(isAllowedBilibiliCdnHost('bilivideo.com')).toBe(false)
    expect(isAllowedBilibiliCdnHost('bilivideo.com.example.org')).toBe(false)
    expect(isAllowedBilibiliCdnHost('127.0.0.1')).toBe(false)
    expect(isAllowedBilibiliCdnHost('localhost')).toBe(false)
  })

  it('only rewrites allowlisted HTTPS URLs', () => {
    expect(toBilibiliCdnProxyUrl('https://i0.hdslb.com/bfs/test.jpg'))
      .toBe('/api/bilibili-cdn/i0.hdslb.com/bfs/test.jpg')
    expect(toBilibiliCdnProxyUrl('http://i0.hdslb.com/bfs/test.jpg')).toBeUndefined()
    expect(toBilibiliCdnProxyUrl('https://example.org/test.mp3')).toBeUndefined()
  })
})
