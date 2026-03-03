import { defineStore } from 'pinia'
import type { Playlist } from '../models/playlist'
import type { Track } from '../models/track'
import { getPlaylists, setPlaylists, getCurrentPlaylistId, setCurrentPlaylistId } from '../services/db'
import { createLogger } from '../services/logger'

function now() { return Date.now() }
const logger = createLogger('Playlists')
function sanitize(playlists: Playlist[]): Playlist[] {
  return playlists.map(p => ({
    id: p.id,
    name: p.name,
    createdAt: p.createdAt,
    updatedAt: p.updatedAt,
    tracks: p.tracks.map(t => ({
      id: t.id,
      title: t.title,
      artist: t.artist,
      album: t.album,
      coverUrl: typeof t.coverUrl === 'string' && t.coverUrl.startsWith('blob:') ? undefined : t.coverUrl,
      duration: t.duration,
      sourceId: t.sourceId,
      sourceRef: t.sourceRef,
      url: typeof t.url === 'string' && t.url.startsWith('blob:') ? undefined : t.url,
      format: t.format,
    })),
  }))
}

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
      logger.info('init start')
      const data = await getPlaylists<Playlist[]>()
      const loaded = Array.isArray(data) ? data : []
      logger.info('loaded from DB', { length: loaded.length })
      if (!this.playlists.length) {
        this.playlists = loaded
        logger.info('state restored', { length: this.playlists.length })
      } else {
        logger.info('skip restore because state already exists', { length: this.playlists.length })
      }
      const savedId = await getCurrentPlaylistId()
      if (savedId && this.playlists.some(p => p.id === savedId)) {
        this.currentId = savedId
        logger.info('currentId restored', { currentId: this.currentId })
      } else if (!this.currentId || !this.playlists.some(p => p.id === this.currentId)) {
        this.currentId = this.playlists[0]?.id || ''
        logger.info('currentId corrected', { currentId: this.currentId })
      } else {
        logger.info('currentId kept', { currentId: this.currentId })
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
  async persist() {
      logger.info('persist', { length: this.playlists.length })
      await setPlaylists(sanitize(this.playlists))
      await setCurrentPlaylistId(this.currentId)
    },
    exportJson(): string { return JSON.stringify(this.playlists) },
    importJson(json: string) {
      try {
        const arr = JSON.parse(json) as Playlist[]
        if (Array.isArray(arr)) { this.playlists = arr; this.currentId = this.playlists[0]?.id || ''; this.persist() }
      } catch {}
    },
  },
})