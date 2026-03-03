import { defineStore } from 'pinia'
import type { PlayMode, Settings } from '../models/settings'

export const useSettingsStore = defineStore('settings', {
  state: () => ({
    settings: {
      defaultVolume: 0.8,
      playMode: 'loop' as PlayMode,
    } as Settings,
  }),
  actions: {
    setVolume(v: number) {
      this.settings.defaultVolume = Math.max(0, Math.min(1, v))
    },
    setMode(mode: PlayMode) {
      this.settings.playMode = mode
    },
  },
  persist: {
    key: 'neko.settings.v1',
    storage: localStorage,
    pick: ['settings'],
  },
})
