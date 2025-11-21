import { defineStore } from 'pinia'
import type { Track } from '../models/track'
import type { PlayMode } from '../models/settings'
import { useSettingsStore } from './settings'

export const usePlayerStore = defineStore('player', {
  state: () => ({
    queue: [] as Track[],
    index: loadIndex(),
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
    setQueue(tracks: Track[], startIndex = 0) {
      this.queue = tracks
      this.index = startIndex
      persistIndex(this.index)
    },
    setMode(mode: PlayMode) {
      this.mode = mode
    },
    setVolume(v: number) {
      this.volume = Math.max(0, Math.min(1, v))
    },
    setPlaying(p: boolean) {
      this.playing = p
      persistIndex(this.index)
    },
    setProgress(current: number, duration: number) {
      this.currentTime = current
      this.duration = duration
    },
    next() {
      if (!this.queue.length) return
      if (this.mode === 'shuffle') {
        this.index = Math.floor(Math.random() * this.queue.length)
      } else if (this.mode === 'single') {
        // stay on current
      } else {
        this.index = (this.index + 1) % this.queue.length
      }
      persistIndex(this.index)
    },
    prev() {
      if (!this.queue.length) return
      if (this.mode === 'shuffle') {
        this.index = Math.floor(Math.random() * this.queue.length)
      } else if (this.mode === 'single') {
        // stay on current
      } else {
        this.index = (this.index - 1 + this.queue.length) % this.queue.length
      }
      persistIndex(this.index)
    },
  },
})

const LS_KEY = 'neko.player.v1.index'

function loadIndex(): number {
  try {
    const raw = localStorage.getItem(LS_KEY)
    const n = raw != null ? Number(raw) : NaN
    return Number.isFinite(n) ? n : -1
  } catch { return -1 }
}

function persistIndex(i: number) {
  try { localStorage.setItem(LS_KEY, String(i)) } catch {}
}