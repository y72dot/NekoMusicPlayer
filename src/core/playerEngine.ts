import type { Track } from '../models/track'
import type { PlayMode } from '../models/settings'
import { usePlayerStore } from '../store/player'
import { useSettingsStore } from '../store/settings'
import { registry } from '../adapters/registry'

class PlayerEngineImpl {
  private audio = new Audio()

  constructor() {
    this.audio.preload = 'metadata'
    this.bindEvents()
  }

  init() {
    const settings = useSettingsStore()
    this.audio.volume = settings.settings.defaultVolume
    const s = usePlayerStore()
    s.setMode(settings.settings.playMode)
  }

  private bindEvents() {
    this.audio.addEventListener('timeupdate', () => {
      const s = usePlayerStore()
      s.setProgress(this.audio.currentTime, this.audio.duration || 0)
    })
    this.audio.addEventListener('ended', () => {
      const s = usePlayerStore()
      if (s.mode === 'single') {
        this.play()
      } else {
        this.next()
        this.play()
      }
    })
    this.audio.addEventListener('error', () => {
      this.next()
      this.play()
    })
  }

  async loadQueue(tracks: Track[], startIndex = 0) {
    const s = usePlayerStore()
    s.setQueue(tracks, startIndex)
    await this.loadCurrent()
  }

  private async loadCurrent() {
    const s = usePlayerStore()
    const t = s.current
    if (!t) return
    let src: string | Blob | undefined = t.url
    if (!src) {
      const a = registry.get(t.sourceId)
      if (a) {
        const r = await a.load(t)
        src = r.url
      }
    }
    if (src instanceof Blob) {
      this.audio.src = URL.createObjectURL(src)
    } else if (typeof src === 'string') {
      this.audio.src = src
    } else {
      this.audio.removeAttribute('src')
    }
    this.audio.load()
  }

  async play() {
    try {
      await this.audio.play()
      const s = usePlayerStore()
      s.setPlaying(true)
    } catch {
      const s = usePlayerStore()
      s.setPlaying(false)
    }
  }
  pause() {
    this.audio.pause()
    const s = usePlayerStore()
    s.setPlaying(false)
  }
  seek(seconds: number) {
    this.audio.currentTime = Math.max(0, seconds)
  }
  setVolume(v: number) {
    this.audio.volume = Math.max(0, Math.min(1, v))
    const s = usePlayerStore()
    s.setVolume(this.audio.volume)
  }
  setMode(mode: PlayMode) {
    const s = usePlayerStore()
    s.setMode(mode)
  }
  async next() {
    const s = usePlayerStore()
    s.next()
    await this.loadCurrent()
  }
  async prev() {
    const s = usePlayerStore()
    s.prev()
    await this.loadCurrent()
  }
  getState() {
    const s = usePlayerStore()
    return { current: s.current, index: s.index, mode: s.mode, volume: s.volume }
  }
}

export const playerEngine = new PlayerEngineImpl()