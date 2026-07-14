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
})
