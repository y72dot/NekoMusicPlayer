import { describe, it, expect, vi, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'

vi.mock('@/core/playerEngine', () => ({
  playerEngine: {
    load: vi.fn().mockResolvedValue(true),
    play: vi.fn().mockResolvedValue(undefined),
    pause: vi.fn(),
    toggle: vi.fn(),
    seek: vi.fn(),
    setVolume: vi.fn(),
    get volume() { return 0.8 },
    get duration() { return 0 },
    get currentTime() { return 0 },
    get paused() { return true },
    get currentTrack() { return undefined },
    on: vi.fn().mockReturnValue(() => {}),
    off: vi.fn(),
  },
}))

import { usePlayerStore } from '@/store/player'
import { playerEngine } from '@/core/playerEngine'
import type { Track } from '@/models/track'
import { PlaybackError } from '@/core/playbackError'

function makeTrack(id: string, title: string): Track {
  return { id, uri: `neko://test/track/${id}`, title, sourceId: 'test', sourceRef: {} }
}

describe('PlayerStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  it('should set queue', async () => {
    const player = usePlayerStore()
    const tracks = [makeTrack('1', 'Song A'), makeTrack('2', 'Song B')]
    await player.setQueue(tracks, 0)
    expect(player.queue).toHaveLength(2)
    expect(player.index).toBe(0)
    expect(playerEngine.load).toHaveBeenCalled()
  })

  it('should get current track', async () => {
    const player = usePlayerStore()
    const tracks = [makeTrack('1', 'Song A')]
    await player.setQueue(tracks, 0)
    expect(player.current?.id).toBe('1')
  })

  it('should reorder queue', async () => {
    const player = usePlayerStore()
    const tracks = [makeTrack('1', 'A'), makeTrack('2', 'B'), makeTrack('3', 'C')]
    await player.setQueue(tracks, 1)
    await player.reorder(0, 2)
    expect(player.queue.map(t => t.id)).toEqual(['2', '3', '1'])
  })

  it('should navigate next in loop mode', async () => {
    const player = usePlayerStore()
    const tracks = [makeTrack('1', 'A'), makeTrack('2', 'B')]
    await player.setQueue(tracks, 0)
    player.mode = 'loop'
    await player.next()
    expect(player.index).toBe(1)
  })

  it('should navigate prev in loop mode', async () => {
    const player = usePlayerStore()
    const tracks = [makeTrack('1', 'A'), makeTrack('2', 'B')]
    await player.setQueue(tracks, 0)
    player.mode = 'loop'
    await player.prev()
    expect(player.index).toBe(1)
  })

  it('should add track to queue', () => {
    const player = usePlayerStore()
    const track = makeTrack('1', 'Test')
    player.add(track)
    expect(player.queue).toHaveLength(1)
    // Adding same track should not duplicate
    player.add(track)
    expect(player.queue).toHaveLength(1)
  })

  it('should remove track from queue', async () => {
    const player = usePlayerStore()
    const tracks = [makeTrack('1', 'A'), makeTrack('2', 'B')]
    await player.setQueue(tracks, 0)
    await player.remove(1)
    expect(player.queue).toHaveLength(1)
  })

  it('should set volume with clamping', () => {
    const player = usePlayerStore()
    player.setVolume(0.5)
    expect(player.volume).toBe(0.5)
    player.setVolume(2)
    expect(player.volume).toBe(1)
    player.setVolume(-1)
    expect(player.volume).toBe(0)
  })

  it('should playNext insert after current', async () => {
    const player = usePlayerStore()
    const tracks = [makeTrack('1', 'A'), makeTrack('2', 'B')]
    await player.setQueue(tracks, 0)
    const newTrack = makeTrack('3', 'C')
    await player.playNext(newTrack)
    expect(player.index).toBe(1)
    expect(player.queue[1].id).toBe('3')
  })

  it('skips one failed queue item without looping forever', async () => {
    const player = usePlayerStore()
    await player.setQueue([makeTrack('1', 'A'), makeTrack('2', 'B')], 0)
    await player.recoverFromError(new PlaybackError('SOURCE_UNAVAILABLE', 'resolve', 'unavailable'))

    expect(player.index).toBe(1)
    expect(player.failedTrackIds).toEqual(['1'])
  })

  it('does not skip on an autoplay policy error', async () => {
    const player = usePlayerStore()
    await player.setQueue([makeTrack('1', 'A'), makeTrack('2', 'B')], 0)
    await player.recoverFromError(new PlaybackError('AUTOPLAY_BLOCKED', 'play', 'blocked'))

    expect(player.index).toBe(0)
  })
})
