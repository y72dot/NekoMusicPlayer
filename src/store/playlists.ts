import { defineStore } from 'pinia'
import type { Playlist } from '../models/playlist'
import type { Track } from '../models/track'
import { getPlaylists, setPlaylists } from '../services/db'

function now() { return Date.now() }

export const usePlaylistsStore = defineStore('playlists', {
  state: () => ({
    playlists: [] as Playlist[],
    currentId: '' as string,
  }),
  getters: {
    current(state) {
      return state.playlists.find(p => p.id === state.currentId)
    },
  },
  actions: {
    async init() {
      const data = await getPlaylists<Playlist[]>()
      if (data?.length) {
        this.playlists = data
        this.currentId = this.playlists[0].id
      }
    },
    async create(name: string) {
      const p: Playlist = { id: crypto.randomUUID(), name, tracks: [], createdAt: now(), updatedAt: now() }
      this.playlists.push(p)
      this.currentId = p.id
      await this.persist()
    },
    async rename(id: string, name: string) {
      const p = this.playlists.find(x => x.id === id)
      if (p) { p.name = name; p.updatedAt = now(); await this.persist() }
    },
    async remove(id: string) {
      this.playlists = this.playlists.filter(p => p.id !== id)
      if (this.currentId === id) {
        this.currentId = this.playlists[0]?.id || ''
      }
      await this.persist()
    },
    setCurrent(id: string) { this.currentId = id },
    async addTracks(id: string, tracks: Track[]) {
      const p = this.playlists.find(x => x.id === id)
      if (!p) return
      const exists = new Set(p.tracks.map(t => `${t.sourceId}:${JSON.stringify(t.sourceRef)}`))
      for (const t of tracks) {
        const key = `${t.sourceId}:${JSON.stringify(t.sourceRef)}`
        if (!exists.has(key)) p.tracks.push(t)
      }
      p.updatedAt = now(); await this.persist()
    },
    async reorder(id: string, from: number, to: number) {
      const p = this.playlists.find(x => x.id === id)
      if (!p) return
      const [item] = p.tracks.splice(from, 1)
      p.tracks.splice(to, 0, item)
      p.updatedAt = now(); await this.persist()
    },
    async persist() { await setPlaylists(this.playlists) },
    exportJson(): string { return JSON.stringify(this.playlists) },
    importJson(json: string) {
      try {
        const arr = JSON.parse(json) as Playlist[]
        if (Array.isArray(arr)) { this.playlists = arr; this.currentId = this.playlists[0]?.id || ''; this.persist() }
      } catch {}
    },
  },
})