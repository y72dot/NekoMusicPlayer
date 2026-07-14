import { describe, it, expect } from 'vitest'
import { externalLinkAdapter } from '@/adapters/externalLinkAdapter'

describe('ExternalLinkAdapter', () => {
  it('should have correct id', () => {
    expect(externalLinkAdapter.id).toBe('external')
  })

  it('should recognize HTTP URLs', () => {
    expect(externalLinkAdapter.canResolve('https://example.com/song.mp3')).toBe(true)
    expect(externalLinkAdapter.canResolve('http://example.com/song.mp3')).toBe(true)
  })

  it('should recognize array of URLs', () => {
    expect(externalLinkAdapter.canResolve(['https://a.com/1.mp3', 'https://b.com/2.mp3'])).toBe(true)
  })

  it('should reject non-URL strings', () => {
    expect(externalLinkAdapter.canResolve('not a url')).toBe(false)
  })

  it('should resolve URLs to tracks', async () => {
    const tracks = await externalLinkAdapter.resolve('https://example.com/music/song.mp3')
    expect(tracks).toHaveLength(1)
    expect(tracks[0].sourceId).toBe('external')
    expect(tracks[0].uri).toContain('neko://external')
  })

  it('should resolve multiple URLs', async () => {
    const urls = ['https://a.com/1.mp3', 'https://b.com/2.mp3']
    const tracks = await externalLinkAdapter.resolve(urls)
    expect(tracks).toHaveLength(2)
  })

  it('should load by URI params', async () => {
    const result = await externalLinkAdapter.loadByUri('stream', { url: 'https://example.com/song.mp3' })
    expect(result.url).toBe('https://example.com/song.mp3')
  })

  it('should throw on missing url param', async () => {
    await expect(externalLinkAdapter.loadByUri('stream', {})).rejects.toThrow()
  })
})
