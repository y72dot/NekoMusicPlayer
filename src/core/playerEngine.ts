import type { Track } from '@/models/track'
import { UriResolver } from '@/core/uriResolver'
import { audioCache } from '@/services/audioCache'
import { createLogger } from '@/services/logger'
import { mediaElementError, normalizePlaybackError, PlaybackError } from '@/core/playbackError'
import { useSettingsStore } from '@/store/settings'

export type PlaybackStatus = 'idle' | 'loading' | 'ready' | 'playing' | 'paused' | 'error'

const logger = createLogger('PlayerEngine')

type PlayerEvents = {
  timeupdate: { currentTime: number; duration: number }
  ended: void
  error: PlaybackError
  statuschange: PlaybackStatus
  play: void
  pause: void
  volumechange: number
  loaded: void
  trackenriched: Track
}

type EventHandler<T> = (payload: T) => void

class EventEmitter {
  private handlers: Map<keyof PlayerEvents, Set<EventHandler<any>>> = new Map()

  on<K extends keyof PlayerEvents>(type: K, handler: EventHandler<PlayerEvents[K]>) {
    if (!this.handlers.has(type)) {
      this.handlers.set(type, new Set())
    }
    this.handlers.get(type)!.add(handler)
    return () => this.off(type, handler)
  }

  off<K extends keyof PlayerEvents>(type: K, handler: EventHandler<PlayerEvents[K]>) {
    const handlers = this.handlers.get(type)
    if (handlers) {
      handlers.delete(handler)
    }
  }

  protected emit<K extends keyof PlayerEvents>(type: K, payload: PlayerEvents[K]) {
    const handlers = this.handlers.get(type)
    if (handlers) {
      handlers.forEach(h => h(payload))
    }
  }
}

class PlayerEngineImpl extends EventEmitter {
  private audio = new Audio()
  private currentObjectUrl?: string
  private _track?: Track
  private loadSequence = 0
  private _status: PlaybackStatus = 'idle'

  constructor() {
    super()
    this.audio.preload = 'metadata'
    this.bindEvents()
  }

  private bindEvents() {
    this.audio.addEventListener('timeupdate', () => {
      this.emit('timeupdate', {
        currentTime: this.audio.currentTime,
        duration: this.audio.duration || 0
      })
    })
    this.audio.addEventListener('ended', () => {
      this.emit('ended', undefined)
    })
    this.audio.addEventListener('error', () => {
      const error = mediaElementError(this.audio.error)
      this.setStatus('error')
      this.emit('error', error)
    })
    this.audio.addEventListener('play', () => {
      this.setStatus('playing')
      this.emit('play', undefined)
    })
    this.audio.addEventListener('pause', () => {
      if (this._status !== 'error' && this._status !== 'loading') this.setStatus('paused')
      this.emit('pause', undefined)
    })
    this.audio.addEventListener('volumechange', () => {
      this.emit('volumechange', this.audio.volume)
    })
    this.audio.addEventListener('loadeddata', () => {
      if (this.audio.paused) this.setStatus('ready')
      this.emit('loaded', undefined)
    })
  }

  private setStatus(status: PlaybackStatus) {
    if (this._status === status) return
    this._status = status
    this.emit('statuschange', status)
  }

  private reportError(error: PlaybackError) {
    this.setStatus('error')
    this.emit('error', error)
    logger.warn(error.code, { stage: error.stage, retryable: error.retryable })
  }

  async load(track: Track): Promise<boolean> {
    const sequence = ++this.loadSequence
    this.audio.pause()
    this.setStatus('loading')
    let src: string | Blob | undefined

    try {
      if (track.uri) {
        const result = await UriResolver.load(track.uri)
        if (sequence !== this.loadSequence) return false
        src = result.url
        const enrichedTrack = { ...track }

        // Merge metadata from adapter into track
        if (result.metadata) {
          const meta = result.metadata
          if (meta.sampleRate !== undefined) enrichedTrack.sampleRate = meta.sampleRate
          if (meta.bitrate !== undefined) enrichedTrack.bitrate = meta.bitrate
          if (meta.bitDepth !== undefined) enrichedTrack.bitDepth = meta.bitDepth
          if (meta.channels !== undefined) enrichedTrack.channels = meta.channels
          if (meta.codec !== undefined) enrichedTrack.codec = meta.codec
          if (meta.container !== undefined) enrichedTrack.container = meta.container
          if (meta.lossless !== undefined) enrichedTrack.lossless = meta.lossless
          this.emit('trackenriched', enrichedTrack)
        }
        this._track = enrichedTrack
      } else {
        throw new PlaybackError('SOURCE_MISSING', 'resolve', '曲目缺少可播放地址。')
      }

      if (!src) throw new PlaybackError('SOURCE_UNAVAILABLE', 'resolve', '没有找到可播放的音频资源。')

      // Only replace the active source after the newest resolution succeeds.
      if (this.currentObjectUrl) {
        URL.revokeObjectURL(this.currentObjectUrl)
        this.currentObjectUrl = undefined
      }

    // Cache Blob for future playback (skip fs tracks, already stored by adapter)
      if (src instanceof Blob && track.sourceId !== 'fs') {
        const limitMb = useSettingsStore().settings.cacheLimitMb || 500
        audioCache.set(track.uri, src, track.sourceId, limitMb * 1024 * 1024).catch(() => {})
      }

    // Set new source
      if (src instanceof Blob) {
        const u = URL.createObjectURL(src)
        this.currentObjectUrl = u
        this.audio.src = u
      } else {
        this.audio.src = src
      }

      this.audio.load()
      this.setStatus('ready')
      return true
    } catch (cause) {
      if (sequence !== this.loadSequence) return false
      const error = normalizePlaybackError(cause, 'resolve')
      this.reportError(error)
      throw error
    }
  }

  async play() {
    try {
      await this.audio.play()
    } catch (e) {
      const error = normalizePlaybackError(e, 'play')
      this.reportError(error)
      throw error
    }
  }

  pause() {
    this.audio.pause()
  }

  async toggle() {
    if (this.audio.paused) {
      await this.play()
    } else {
      this.pause()
    }
  }

  seek(seconds: number) {
    if (Number.isFinite(seconds)) {
      this.audio.currentTime = Math.max(0, seconds)
    }
  }

  setVolume(v: number) {
    this.audio.volume = Math.max(0, Math.min(1, v))
  }

  get volume() {
    return this.audio.volume
  }
  
  get duration() {
    return this.audio.duration || 0
  }

  get currentTime() {
    return this.audio.currentTime
  }
  
  get paused() {
    return this.audio.paused
  }

  get currentTrack() {
    return this._track
  }

  get status() {
    return this._status
  }
}

export const playerEngine = new PlayerEngineImpl()
