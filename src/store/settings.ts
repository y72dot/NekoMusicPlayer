import { defineStore } from 'pinia'
import type { PlayMode, Settings } from '../models/settings'

const LS_KEY = 'neko.settings.v1'

function loadSettings(): Settings {
  const raw = localStorage.getItem(LS_KEY)
  if (raw) {
    try {
      const s = JSON.parse(raw) as Settings
      return s
    } catch {}
  }
  return { defaultVolume: 0.8, playMode: 'loop' }
}

export const useSettingsStore = defineStore('settings', {
  state: () => ({
    settings: loadSettings(),
  }),
  actions: {
    setVolume(v: number) {
      this.settings.defaultVolume = Math.max(0, Math.min(1, v))
      this.persist()
    },
    setMode(mode: PlayMode) {
      this.settings.playMode = mode
      this.persist()
    },
    persist() {
      localStorage.setItem(LS_KEY, JSON.stringify(this.settings))
    },
  },
})