import { defineStore } from 'pinia'
import type { Track } from '../models/track'
import type { PlayMode } from '../models/settings'
import { useSettingsStore } from './settings'
import { usePlaylistsStore } from './playlists'
import { playerEngine } from '../core/playerEngine'

export const usePlayerStore = defineStore('player', {
  state: () => ({
    queue: [] as Track[],
    index: 0,
    volume: useSettingsStore().settings.defaultVolume,
    mode: useSettingsStore().settings.playMode as PlayMode,
    playing: false,
    currentTime: 0,
    duration: 0,
  }),
  getters: {
    current(state) {
      return state.index >= 0 ? state.queue[state.index] : undefined
    },
  },
  actions: {
    async setQueue(tracks: Track[], startIndex = 0) {
      this.queue = tracks
      this.index = startIndex
      // persistIndex handled by plugin
      if (this.current) {
        await playerEngine.load(this.current)
      }
    },
    
    async play(track?: Track) {
      if (track) {
        await playerEngine.load(track)
      } else if (this.current) {
        if (playerEngine.paused) await playerEngine.play()
      }
    },

    pause() {
      playerEngine.pause()
    },

    async toggle() {
      if (!this.current && this.queue.length === 0) {
        // Smart Play: if queue is empty, try to load library
        const playlists = usePlaylistsStore()
        if (playlists.library.length > 0) {
          await this.setQueue(playlists.library, 0)
          await this.play()
          return
        }
      }
      playerEngine.toggle()
    },
    
    seek(time: number) {
      playerEngine.seek(time)
    },

    setMode(mode: PlayMode) {
      this.mode = mode
    },
    
    setVolume(v: number) {
      this.volume = Math.max(0, Math.min(1, v))
      playerEngine.setVolume(this.volume)
    },
    
    // Internal state setters called by event listeners
    setPlaying(p: boolean) {
      this.playing = p
    },
    
    setProgress(current: number, duration: number) {
      this.currentTime = current
      this.duration = duration
    },
    
    async next() {
      if (!this.queue.length) return
      if (this.mode === 'shuffle') {
        this.index = Math.floor(Math.random() * this.queue.length)
      } else {
        this.index = (this.index + 1) % this.queue.length
      }
      if (this.current) {
        await playerEngine.load(this.current)
        await playerEngine.play()
      }
    },
    
    async prev() {
      if (!this.queue.length) return
      if (this.mode === 'shuffle') {
        this.index = Math.floor(Math.random() * this.queue.length)
      } else {
        this.index = (this.index - 1 + this.queue.length) % this.queue.length
      }
      if (this.current) {
        await playerEngine.load(this.current)
        await playerEngine.play()
      }
    },

    async onTrackEnded() {
      if (this.mode === 'single') {
        if (this.current) {
           playerEngine.seek(0)
           await playerEngine.play()
        }
      } else {
        await this.next()
      }
    }
  },
  persist: {
    key: 'neko.player.v1.index',
    storage: localStorage,
    pick: ['index'],
  },
})
