import { describe, it, expect, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useSettingsStore } from '@/store/settings'

describe('SettingsStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('should have default settings', () => {
    const settings = useSettingsStore()
    expect(settings.settings.defaultVolume).toBe(0.8)
    expect(settings.settings.playMode).toBe('loop')
  })

  it('should set volume', () => {
    const settings = useSettingsStore()
    settings.setVolume(0.5)
    expect(settings.settings.defaultVolume).toBe(0.5)
  })

  it('should clamp volume', () => {
    const settings = useSettingsStore()
    settings.setVolume(2)
    expect(settings.settings.defaultVolume).toBe(1)
    settings.setVolume(-1)
    expect(settings.settings.defaultVolume).toBe(0)
  })

  it('should set play mode', () => {
    const settings = useSettingsStore()
    settings.setMode('single')
    expect(settings.settings.playMode).toBe('single')
    settings.setMode('shuffle')
    expect(settings.settings.playMode).toBe('shuffle')
  })

  it('should set netease cookie', () => {
    const settings = useSettingsStore()
    settings.setNeteaseCookie('test-cookie')
    expect(settings.settings.neteaseCookie).toBe('test-cookie')
  })

  it('should set netease csrf', () => {
    const settings = useSettingsStore()
    settings.setNeteaseCsrf('test-csrf')
    expect(settings.settings.neteaseCsrf).toBe('test-csrf')
  })

  it('should set bilibili sessdata', () => {
    const settings = useSettingsStore()
    settings.setBilibiliSessdata('test-sessdata')
    expect(settings.settings.bilibiliSessdata).toBe('test-sessdata')
  })

  it('should set bilibili csrf', () => {
    const settings = useSettingsStore()
    settings.setBilibiliCsrf('test-bili-csrf')
    expect(settings.settings.bilibiliCsrf).toBe('test-bili-csrf')
  })

  it('should set bilibili buvid3', () => {
    const settings = useSettingsStore()
    settings.setBilibiliBuvid3('test-buvid3')
    expect(settings.settings.bilibiliBuvid3).toBe('test-buvid3')
  })
})
