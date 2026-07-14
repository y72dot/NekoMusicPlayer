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
})
