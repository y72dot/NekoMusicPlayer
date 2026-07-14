import { defineStore } from 'pinia'
import type { Playlist } from '@/models/playlist'
import type { Track } from '@/models/track'
import { getPlaylists, setPlaylists, getCurrentPlaylistId, setCurrentPlaylistId, getLibrary, setLibrary } from '@/services/db'
import { createLogger } from '@/services/logger'

function now() { return Date.now() }
const logger = createLogger('Playlists')

function sanitizeTracks(tracks: Track[]): Track[] {
  return tracks.map(t => ({
    id: t.id,
    uri: t.uri,
    title: t.title,
    artist: t.artist,
    album: t.album,
    coverUrl: typeof t.coverUrl === 'string' && t.coverUrl.startsWith('blob:') ? undefined : t.coverUrl,
    duration: t.duration,
    sourceId: t.sourceId,
    sourceRef: t.sourceRef,
    url: typeof t.url === 'string' && t.url.startsWith('blob:') ? undefined : t.url,
    format: t.format,
  }))
}

function sanitize(playlists: Playlist[]): Playlist[] {
  return playlists.map(p => ({
    id: p.id,
    name: p.name,
    createdAt: p.createdAt,
    updatedAt: p.updatedAt,
    tracks: sanitizeTracks(p.tracks),
  }))
}

export const usePlaylistsStore = defineStore('playlists', {
  state: () => ({
    playlists: [] as Playlist[],
    library: [] as Track[],
    currentId: '' as string,
  }),
  getters: {
    current(state) {
      return state.playlists.find(p => p.id === state.currentId)
    },
  },
  actions: {
    async init() {
      logger.info('init start')
      
      // Load Playlists
      const data = await getPlaylists<Playlist[]>()
      const loaded = Array.isArray(data) ? data : []
      if (!this.playlists.length) {
        this.playlists = loaded
      }

      // Load Library
      const libData = await getLibrary<Track[]>()
      const libLoaded = Array.isArray(libData) ? libData : []
      if (!this.library.length) {
        this.library = libLoaded
      }

      const savedId = await getCurrentPlaylistId()
      if (savedId && this.playlists.some(p => p.id === savedId)) {
        this.currentId = savedId
      } else if (!this.currentId || !this.playlists.some(p => p.id === this.currentId)) {
        this.currentId = this.playlists[0]?.id || ''
      }
      
      await setCurrentPlaylistId(this.currentId)
      await this.persist()
    },
    async create(name: string) {
      const p: Playlist = { id: crypto.randomUUID(), name, tracks: [], createdAt: now(), updatedAt: now() }
      logger.info('create', { id: p.id, name: p.name })
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
    async setCurrent(id: string) { this.currentId = id; await setCurrentPlaylistId(id) },
    async addTracks(id: string, tracks: Track[]) {
      const p = this.playlists.find(x => x.id === id)
      if (!p) return
      // Use URI for deduplication if available, otherwise fallback to sourceId+sourceRef
      const exists = new Set(p.tracks.map(t => t.uri || `${t.sourceId}:${JSON.stringify(t.sourceRef)}`))
      for (const t of tracks) {
        const key = t.uri || `${t.sourceId}:${JSON.stringify(t.sourceRef)}`
        if (!exists.has(key)) {
          p.tracks.push(t)
          exists.add(key)
        }
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
  async persist() {
      logger.info('persist', { length: this.playlists.length, libLength: this.library.length })
      await setPlaylists(sanitize(this.playlists))
      await setLibrary(sanitizeTracks(this.library))
      await setCurrentPlaylistId(this.currentId)
    },
    
    async addToLibrary(tracks: Track[]) {
      const exists = new Set(this.library.map(t => t.uri || `${t.sourceId}:${JSON.stringify(t.sourceRef)}`))
      let added = false
      for (const t of tracks) {
        const key = t.uri || `${t.sourceId}:${JSON.stringify(t.sourceRef)}`
        if (!exists.has(key)) {
          this.library.push(t)
          exists.add(key)
          added = true
        }
      }
      if (added) await this.persist()
    },

    exportJson(): string { return JSON.stringify({ playlists: this.playlists, library: this.library }) },
    importJson(json: string) {
      try {
        const data = JSON.parse(json)
        if (Array.isArray(data)) {
          this.playlists = data
        } else if (data && typeof data === 'object') {
          if (Array.isArray((data as any).playlists)) this.playlists = (data as any).playlists
          if (Array.isArray((data as any).library)) this.library = (data as any).library
        }
        
        if (!this.currentId || !this.playlists.some(p => p.id === this.currentId)) {
          this.currentId = this.playlists[0]?.id || ''
        }
        this.persist()
      } catch {}
    },
  },
})