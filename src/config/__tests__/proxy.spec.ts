import { describe, expect, it } from 'vitest'
import {
  isAllowedBilibiliCdnHost,
  isAllowedNeteaseMediaHost,
  toBilibiliCdnProxyUrl,
  toNeteaseMediaProxyUrl,
} from '@/config/proxy'

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

  it('rewrites NetEase media URLs without changing their signed protocol', () => {
    expect(isAllowedNeteaseMediaHost('m704.music.126.net')).toBe(true)
    expect(toNeteaseMediaProxyUrl('http://m704.music.126.net/audio.mp3?token=test'))
      .toBe('/api/netease-media/http/m704.music.126.net/audio.mp3?token=test')
    expect(toNeteaseMediaProxyUrl('https://m804.music.126.net/audio.mp3'))
      .toBe('/api/netease-media/https/m804.music.126.net/audio.mp3')
  })

  it('rejects non-NetEase media targets and lookalikes', () => {
    expect(isAllowedNeteaseMediaHost('music.126.net')).toBe(false)
    expect(isAllowedNeteaseMediaHost('m1.music.126.net.example.org')).toBe(false)
    expect(toNeteaseMediaProxyUrl('http://127.0.0.1/audio.mp3')).toBeUndefined()
    expect(toNeteaseMediaProxyUrl('ftp://m1.music.126.net/audio.mp3')).toBeUndefined()
  })
})
