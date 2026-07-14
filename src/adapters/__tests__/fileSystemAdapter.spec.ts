import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/services/db', () => ({
  setBlob: vi.fn().mockResolvedValue(undefined),
  getBlob: vi.fn().mockResolvedValue(new Blob(['test'], { type: 'audio/mpeg' })),
}))

vi.mock('music-metadata', () => ({
  parseBlob: vi.fn().mockResolvedValue({
    common: {
      title: 'Test Song',
      artist: 'Test Artist',
      album: 'Test Album',
      picture: [],
    },
    format: { duration: 180 },
  }),
}))

import { fileSystemAdapter } from '@/adapters/fileSystemAdapter'

describe('FileSystemAdapter', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should have correct id', () => {
    expect(fileSystemAdapter.id).toBe('fs')
  })

  it('should recognize File objects', () => {
    const file = new File([''], 'test.mp3', { type: 'audio/mpeg' })
    expect(fileSystemAdapter.canResolve(file)).toBe(true)
  })

  it('should recognize array of Files', () => {
    const files = [
      new File([''], 'a.mp3', { type: 'audio/mpeg' }),
      new File([''], 'b.mp3', { type: 'audio/mpeg' }),
    ]
    expect(fileSystemAdapter.canResolve(files)).toBe(true)
  })

  it('should reject non-File input', () => {
    expect(fileSystemAdapter.canResolve('string')).toBe(false)
  })

  it('should resolve File to Track with metadata', async () => {
    const file = new File(['test audio data'], 'song.mp3', { type: 'audio/mpeg' })
    const tracks = await fileSystemAdapter.resolve(file)
    expect(tracks).toHaveLength(1)
    expect(tracks[0].title).toBe('Test Song')
    expect(tracks[0].artist).toBe('Test Artist')
    expect(tracks[0].album).toBe('Test Album')
    expect(tracks[0].duration).toBe(180)
    expect(tracks[0].sourceId).toBe('fs')
    expect(tracks[0].uri).toContain('neko://fs')
  })

  it('should fallback to filename on parse error', async () => {
    const mm = await import('music-metadata')
    vi.mocked(mm.parseBlob).mockRejectedValueOnce(new Error('parse failed'))

    const file = new File(['test'], 'fallback.mp3', { type: 'audio/mpeg' })
    const tracks = await fileSystemAdapter.resolve(file)
    expect(tracks[0].title).toBe('fallback.mp3')
  })

  it('should load blob by uri', async () => {
    const result = await fileSystemAdapter.loadByUri('test-id', {})
    expect(result.url).toBeInstanceOf(Blob)
  })
})
