import { describe, it, expect } from 'vitest'
import { UriResolver } from '@/core/uriResolver'

describe('UriResolver', () => {
  it('should parse a valid neko:// URI', () => {
    const parsed = UriResolver.parse('neko://fs/track/123?name=test.mp3')
    expect(parsed.sourceId).toBe('fs')
    expect(parsed.type).toBe('track')
    expect(parsed.resourceId).toBe('123')
    expect(parsed.params.name).toBe('test.mp3')
  })

  it('should generate a URI', () => {
    const uri = UriResolver.generate('fs', 'track', 'abc', { name: 'song.mp3' })
    expect(uri).toContain('neko://fs/track/abc')
    expect(uri).toContain('name=song.mp3')
  })

  it('should generate and parse roundtrip', () => {
    const uri = UriResolver.generate('external', 'track', 'stream', { url: 'https://example.com/song.mp3' })
    const parsed = UriResolver.parse(uri)
    expect(parsed.sourceId).toBe('external')
    expect(parsed.resourceId).toBe('stream')
    expect(parsed.params.url).toBe('https://example.com/song.mp3')
  })

  it('should throw on invalid protocol', () => {
    expect(() => UriResolver.parse('https://example.com')).toThrow()
  })
})
