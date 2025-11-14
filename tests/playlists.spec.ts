import { describe, it, expect, beforeEach } from 'vitest'
import { usePlaylists } from '../src/stores/playlists'
import { useLibrary } from '../src/stores/library'

function reset() {
  localStorage.clear()
  useLibrary.setState({ tracks: {}, order: [] })
  usePlaylists.setState({ playlists: {}, order: [], currentPlaylistId: undefined })
}

describe('playlists store', () => {
  beforeEach(() => reset())

  it('creates playlist and adds valid references only', () => {
    useLibrary.setState({ tracks: { 'a': { id: 'a', title: 'A', artist: '', album: '', format: 'unknown', sourceType: 'custom', sourceRef: { providerId: 'x', pathOrKey: 'x' } } as any }, order: ['a'] })
    usePlaylists.getState().createPlaylist('P1')
    const pid = usePlaylists.getState().order[0]
    usePlaylists.getState().addToPlaylist(pid, ['a', 'missing'])
    expect(usePlaylists.getState().playlists[pid].trackIds).toEqual(['a'])
  })

  it('batch add/remove works and de-duplicates', () => {
    useLibrary.setState({ tracks: { 'a': {} as any, 'b': {} as any, 'c': {} as any }, order: ['a','b','c'] })
    usePlaylists.getState().createPlaylist('P1')
    const pid = usePlaylists.getState().order[0]
    usePlaylists.getState().addManyToPlaylist(pid, ['a','b','b'])
    expect(usePlaylists.getState().playlists[pid].trackIds.sort()).toEqual(['a','b'])
    usePlaylists.getState().removeManyFromPlaylist(pid, ['a'])
    expect(usePlaylists.getState().playlists[pid].trackIds).toEqual(['b'])
  })

  it('validates references after library changes', () => {
    useLibrary.setState({ tracks: { 'a': {} as any, 'b': {} as any }, order: ['a','b'] })
    usePlaylists.getState().createPlaylist('P1')
    const pid = usePlaylists.getState().order[0]
    usePlaylists.getState().addManyToPlaylist(pid, ['a','b'])
    useLibrary.setState({ tracks: { 'a': {} as any }, order: ['a'] })
    usePlaylists.getState().validatePlaylistRefs()
    expect(usePlaylists.getState().playlists[pid].trackIds).toEqual(['a'])
  })

  it('imports with validation', () => {
    useLibrary.setState({ tracks: { 'a': {} as any }, order: ['a'] })
    usePlaylists.getState().importPlaylistsWithValidation([{ id: 'p', name: 'P', trackIds: ['a','missing'], createdAt: 1, updatedAt: 1 } as any])
    expect(usePlaylists.getState().playlists['p'].trackIds).toEqual(['a'])
  })
})
