import { defineStore } from 'pinia'
import type { PlayMode, Settings } from '@/models/settings'

export const useSettingsStore = defineStore('settings', {
  state: () => ({
    settings: {
      defaultVolume: 0.8,
      playMode: 'loop' as PlayMode,
      neteaseCookie: '',
      neteaseCsrf: '',
      bilibiliSessdata: '',
      bilibiliCsrf: '',
      bilibiliBuvid3: '',
      cacheLimitMb: 500,
    } as Settings,
  }),
  actions: {
    setVolume(v: number) {
      this.settings.defaultVolume = Math.max(0, Math.min(1, v))
    },
    setMode(mode: PlayMode) {
      this.settings.playMode = mode
    },
    setNeteaseCookie(cookie: string) {
      this.settings.neteaseCookie = cookie
    },
    setNeteaseCsrf(csrf: string) {
      this.settings.neteaseCsrf = csrf
    },
    setBilibiliSessdata(s: string) {
      this.settings.bilibiliSessdata = s
    },
    setBilibiliCsrf(c: string) {
      this.settings.bilibiliCsrf = c
    },
    setBilibiliBuvid3(b: string) {
      this.settings.bilibiliBuvid3 = b
    },
    setCacheLimitMb(value: number) {
      this.settings.cacheLimitMb = Math.max(50, Math.min(2000, Math.round(value)))
    },
    clearNeteaseCredentials() {
      this.settings.neteaseCookie = ''
      this.settings.neteaseCsrf = ''
    },
    clearBilibiliCredentials() {
      this.settings.bilibiliSessdata = ''
      this.settings.bilibiliCsrf = ''
      this.settings.bilibiliBuvid3 = ''
    },
  },
  persist: {
    key: 'neko.settings.v1',
    storage: localStorage,
    paths: ['settings'],
  },
})
