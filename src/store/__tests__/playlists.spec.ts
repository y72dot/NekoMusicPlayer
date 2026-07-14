import { describe, it, expect, vi, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'

vi.mock('@/services/db', () => ({
  getPlaylists: vi.fn().mockResolvedValue([]),
  setPlaylists: vi.fn().mockResolvedValue(undefined),
  getLibrary: vi.fn().mockResolvedValue([]),
  setLibrary: vi.fn().mockResolvedValue(undefined),
  getCurrentPlaylistId: vi.fn().mockResolvedValue(''),
  setCurrentPlaylistId: vi.fn().mockResolvedValue(undefined),
}))

import { usePlaylistsStore } from '@/store/playlists'
import type { Track } from '@/models/track'

function makeTrack(id: string, title: string): Track {
  return { id, uri: `neko://test/track/${id}`, title, sourceId: 'test', sourceRef: {} }
}

describe('PlaylistsStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  it('should create playlist', async () => {
    const store = usePlaylistsStore()
    await store.create('Test Playlist')
    expect(store.playlists).toHaveLength(1)
    expect(store.playlists[0].name).toBe('Test Playlist')
    expect(store.currentId).toBe(store.playlists[0].id)
  })

  it('should rename playlist', async () => {
    const store = usePlaylistsStore()
    await store.create('Old Name')
    const id = store.playlists[0].id
    await store.rename(id, 'New Name')
    expect(store.playlists[0].name).toBe('New Name')
  })

  it('should remove playlist', async () => {
    const store = usePlaylistsStore()
    await store.create('P1')
    await store.create('P2')
    const id = store.playlists[0].id
    await store.remove(id)
    expect(store.playlists).toHaveLength(1)
    expect(store.currentId).toBe(store.playlists[0].id)
  })

  it('should add tracks to playlist with deduplication', async () => {
    const store = usePlaylistsStore()
    await store.create('P1')
    const id = store.playlists[0].id
    const tracks = [makeTrack('1', 'A'), makeTrack('2', 'B')]
    await store.addTracks(id, tracks)
    expect(store.playlists[0].tracks).toHaveLength(2)
    // Adding same tracks should not duplicate
    await store.addTracks(id, tracks)
    expect(store.playlists[0].tracks).toHaveLength(2)
  })

  it('should add tracks to library', async () => {
    const store = usePlaylistsStore()
    const tracks = [makeTrack('1', 'A')]
    await store.addToLibrary(tracks)
    expect(store.library).toHaveLength(1)
    // Adding same tracks should not duplicate
    await store.addToLibrary(tracks)
    expect(store.library).toHaveLength(1)
  })

  it('should export and import JSON', async () => {
    const store = usePlaylistsStore()
    await store.create('P1')
    const json = store.exportJson()
    const data = JSON.parse(json)
    expect(data.playlists).toHaveLength(1)
    expect(data.library).toHaveLength(0)

    store.importJson(json)
    expect(store.playlists).toHaveLength(1)
  })
})
