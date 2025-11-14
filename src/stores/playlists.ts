import create from 'zustand'
import { persist } from 'zustand/middleware'
import type { Playlist, ID } from '../providers/types'
import { useLibrary } from './library'

type State = {
  playlists: Record<string, Playlist>
  order: ID[]
  currentPlaylistId?: ID
}

type Actions = {
  createPlaylist: (name: string) => void
  renamePlaylist: (id: ID, name: string) => void
  deletePlaylist: (id: ID) => void
  addToPlaylist: (id: ID, trackIds: ID[]) => void
  removeFromPlaylist: (id: ID, trackId: ID) => void
  reorderPlaylist: (id: ID, from: number, to: number) => void
  setCurrent: (id?: ID | '__all__') => void
  importPlaylists: (data: Playlist[]) => void
  addManyToPlaylist: (id: ID, trackIds: ID[], mode?: 'append' | 'replace') => void
  removeManyFromPlaylist: (id: ID, trackIds: ID[]) => void
  validatePlaylistRefs: () => void
  importPlaylistsWithValidation: (data: Playlist[]) => void
  sortPlaylist: (id: ID, key: Playlist['sortKey'], direction: Playlist['sortDirection'], mode: Playlist['sortMode']) => void
  dedupePlaylist: (id: ID) => void
  moveSelected: (id: ID, selectedIds: ID[], toIndex: number) => void
}

export const usePlaylists = create<State & Actions>()(persist((set, get) => ({
  playlists: {},
  order: [],
  currentPlaylistId: undefined,
  createPlaylist(name) {
    const id = crypto.randomUUID()
    const p: Playlist = { id, name, trackIds: [], createdAt: Date.now(), updatedAt: Date.now() }
    set({ playlists: { ...get().playlists, [id]: p }, order: [...get().order, id], currentPlaylistId: id })
  },
  renamePlaylist(id, name) {
    const p = get().playlists[id]
    if (!p) return
    set({ playlists: { ...get().playlists, [id]: { ...p, name, updatedAt: Date.now() } } })
  },
  deletePlaylist(id) {
    const { [id]: _, ...rest } = get().playlists
    const order = get().order.filter(x => x !== id)
    const currentPlaylistId = get().currentPlaylistId === id ? undefined : get().currentPlaylistId
    set({ playlists: rest, order, currentPlaylistId })
  },
  addToPlaylist(id, trackIds) {
    const p = get().playlists[id]
    if (!p) return
    const valid = useLibrary.getState().tracks
    const filtered = trackIds.filter(x => !!valid[x])
    const setNew = Array.from(new Set([...p.trackIds, ...filtered]))
    set({ playlists: { ...get().playlists, [id]: { ...p, trackIds: setNew, updatedAt: Date.now() } } })
  },
  removeFromPlaylist(id, trackId) {
    const p = get().playlists[id]
    if (!p) return
    const next = p.trackIds.filter(x => x !== trackId)
    set({ playlists: { ...get().playlists, [id]: { ...p, trackIds: next, updatedAt: Date.now() } } })
  },
  reorderPlaylist(id, from, to) {
    const p = get().playlists[id]
    if (!p) return
    const arr = [...p.trackIds]
    const [item] = arr.splice(from, 1)
    arr.splice(to, 0, item)
    set({ playlists: { ...get().playlists, [id]: { ...p, trackIds: arr, updatedAt: Date.now() } } })
  },
  setCurrent(id) { set({ currentPlaylistId: id }) },
  importPlaylists(data) {
    const map: Record<string, Playlist> = {}
    const order: ID[] = []
    for (const p of data) { map[p.id] = p; order.push(p.id) }
    set({ playlists: map, order, currentPlaylistId: order[0] })
  },
  addManyToPlaylist(id, trackIds, mode = 'append') {
    const p = get().playlists[id]
    if (!p) return
    const valid = useLibrary.getState().tracks
    const filtered = trackIds.filter(x => !!valid[x])
    const current = new Set(p.trackIds)
    if (mode === 'replace') {
      const next = Array.from(new Set(filtered))
      set({ playlists: { ...get().playlists, [id]: { ...p, trackIds: next, updatedAt: Date.now() } } })
    } else {
      for (const t of filtered) current.add(t)
      set({ playlists: { ...get().playlists, [id]: { ...p, trackIds: Array.from(current), updatedAt: Date.now() } } })
    }
  },
  removeManyFromPlaylist(id, trackIds) {
    const p = get().playlists[id]
    if (!p) return
    const remove = new Set(trackIds)
    const next = p.trackIds.filter(x => !remove.has(x))
    set({ playlists: { ...get().playlists, [id]: { ...p, trackIds: next, updatedAt: Date.now() } } })
  },
  sortPlaylist(id, key, direction, mode) {
    const p = get().playlists[id]
    if (!p) return
    const lib = useLibrary.getState().tracks
    const dir = direction === 'desc' ? -1 : 1
    const val = (tid: ID) => {
      const t = lib[tid]
      if (!t) return ''
      switch (key) {
        case 'title': return t.title || ''
        case 'artist': return t.artist || ''
        case 'album': return t.album || ''
        case 'trackNo': return t.trackNo || 0
        case 'duration': return t.duration || 0
        case 'createdAt': return p.createdAt || 0
        default: return ''
      }
    }
    if (mode === 'materialize') {
      const next = [...p.trackIds].sort((a, b) => {
        const va = val(a) as any
        const vb = val(b) as any
        if (typeof va === 'number' && typeof vb === 'number') return (va - vb) * dir
        return String(va).localeCompare(String(vb)) * dir
      })
      set({ playlists: { ...get().playlists, [id]: { ...p, trackIds: next, sortKey: key, sortDirection: direction, sortMode: mode, updatedAt: Date.now() } } })
    } else {
      set({ playlists: { ...get().playlists, [id]: { ...p, sortKey: key, sortDirection: direction, sortMode: mode, updatedAt: Date.now() } } })
    }
  },
  dedupePlaylist(id) {
    const p = get().playlists[id]
    if (!p) return
    const seen = new Set<ID>()
    const next: ID[] = []
    for (const tid of p.trackIds) { if (!seen.has(tid)) { seen.add(tid); next.push(tid) } }
    set({ playlists: { ...get().playlists, [id]: { ...p, trackIds: next, updatedAt: Date.now() } } })
  },
  moveSelected(id, selectedIds, toIndex) {
    const p = get().playlists[id]
    if (!p || !selectedIds.length) return
    const selected = new Set(selectedIds)
    const remain = p.trackIds.filter(x => !selected.has(x))
    let idx = Math.max(0, Math.min(remain.length, toIndex))
    const block = p.trackIds.filter(x => selected.has(x))
    const next = [...remain]
    next.splice(idx, 0, ...block)
    set({ playlists: { ...get().playlists, [id]: { ...p, trackIds: next, updatedAt: Date.now() } } })
  },
  validatePlaylistRefs() {
    const validIds = new Set(Object.keys(useLibrary.getState().tracks))
    const all = get().playlists
    let changed = false
    const next: Record<string, Playlist> = {}
    for (const pid of Object.keys(all)) {
      const p = all[pid]
      const filtered = p.trackIds.filter(x => validIds.has(x))
      if (filtered.length !== p.trackIds.length) {
        next[pid] = { ...p, trackIds: filtered, updatedAt: Date.now() }
        changed = true
      } else {
        next[pid] = p
      }
    }
    if (changed) set({ playlists: next })
  },
  importPlaylistsWithValidation(data) {
    const validIds = new Set(Object.keys(useLibrary.getState().tracks))
    const map: Record<string, Playlist> = {}
    const order: ID[] = []
    for (const p of data) {
      const filtered = { ...p, trackIds: (p.trackIds || []).filter(x => validIds.has(x)), updatedAt: Date.now() }
      map[p.id] = filtered
      order.push(p.id)
    }
    set({ playlists: map, order, currentPlaylistId: order[0] })
  }
}), { name: 'playlists' }))

// 实时订阅 library 变化，校验引用有效性
useLibrary.subscribe(s => s.tracks, () => {
  try { usePlaylists.getState().validatePlaylistRefs() } catch {}
})
