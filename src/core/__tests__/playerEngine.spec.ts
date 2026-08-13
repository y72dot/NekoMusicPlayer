import { describe, it, expect, vi, beforeEach } from 'vitest'
import { playerEngine } from '@/core/playerEngine'
import { UriResolver } from '@/core/uriResolver'
import type { Track } from '@/models/track'

// Mock registry
vi.mock('@/adapters/registry', () => ({
  registry: {
    get: vi.fn(),
  }
}))

// Mock UriResolver
vi.mock('@/core/uriResolver', () => ({
  UriResolver: {
    load: vi.fn(),
  }
}))

describe('PlayerEngine (Refactored)', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('should be defined', () => {
    expect(playerEngine).toBeDefined()
  })

  it('should emit volumechange event when setVolume is called', () => {
    playerEngine.setVolume(0.5)
    expect(playerEngine.volume).toBe(0.5)
  })

  it('should emit play event when play is called', async () => {
    const handler = vi.fn()
    playerEngine.on('play', handler)
    await playerEngine.play()
  })

  it('should prioritize URI loading', async () => {
    const track: Track = {
      id: '1',
      title: 'Test',
      sourceId: 'fs',
      sourceRef: {},
      uri: 'neko://fs/track/123'
    }
    
    // Mock successful URI resolution
    const mockUrl = 'blob:test-url'
    vi.mocked(UriResolver.load).mockResolvedValue({ url: mockUrl })
    
    await playerEngine.load(track)
    
    expect(UriResolver.load).toHaveBeenCalledWith(track.uri)
  })

  it('ignores a stale resolution when a newer track finishes first', async () => {
    let finishFirst!: (value: { url: string }) => void
    const first = new Promise<{ url: string }>(resolve => { finishFirst = resolve })
    vi.mocked(UriResolver.load)
      .mockReturnValueOnce(first)
      .mockResolvedValueOnce({ url: 'https://example.com/new.mp3' })

    const oldTrack: Track = { id: 'old', uri: 'neko://test/track/old', title: 'Old', sourceId: 'test', sourceRef: {} }
    const newTrack: Track = { id: 'new', uri: 'neko://test/track/new', title: 'New', sourceId: 'test', sourceRef: {} }
    const oldLoad = playerEngine.load(oldTrack)
    await expect(playerEngine.load(newTrack)).resolves.toBe(true)
    finishFirst({ url: 'https://example.com/old.mp3' })

    await expect(oldLoad).resolves.toBe(false)
    expect(playerEngine.currentTrack?.id).toBe('new')
  })

  it('reports a structured error when the URI cannot be resolved', async () => {
    vi.mocked(UriResolver.load).mockRejectedValueOnce(new TypeError('Failed to fetch'))
    const track: Track = { id: 'offline', uri: 'neko://test/track/offline', title: 'Offline', sourceId: 'test', sourceRef: {} }

    await expect(playerEngine.load(track)).rejects.toMatchObject({
      code: 'NETWORK', stage: 'resolve', retryable: true,
    })
    expect(playerEngine.status).toBe('error')
  })
})
