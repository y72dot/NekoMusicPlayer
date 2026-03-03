import type { Track } from '../models/track'
import { registry } from '../adapters/registry'

type PlayerEvents = {
  timeupdate: { currentTime: number; duration: number }
  ended: void
  error: Event
  play: void
  pause: void
  volumechange: number
  loaded: void
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
    this.audio.addEventListener('error', (e) => {
      this.emit('error', e)
    })
    this.audio.addEventListener('play', () => {
      this.emit('play', undefined)
    })
    this.audio.addEventListener('pause', () => {
      this.emit('pause', undefined)
    })
    this.audio.addEventListener('volumechange', () => {
      this.emit('volumechange', this.audio.volume)
    })
    this.audio.addEventListener('loadeddata', () => {
      this.emit('loaded', undefined)
    })
  }

  async load(track: Track) {
    this._track = track
    let src: string | Blob | undefined = track.url
    
    // Handle Blob URL string check
    if (typeof src === 'string' && src.startsWith('blob:')) {
      src = undefined
    }

    // Resolve if no direct source
    if (!src) {
      const adapter = registry.get(track.sourceId)
      if (adapter) {
        try {
          const result = await adapter.load(track)
          src = result.url
          if (typeof src === 'string' && src.startsWith('blob:')) {
            src = undefined
          }
        } catch (e) {
          console.error('Failed to resolve track source', e)
          // Consider emitting error here too
        }
      }
    }

    // Cleanup previous object URL
    if (this.currentObjectUrl) {
      URL.revokeObjectURL(this.currentObjectUrl)
      this.currentObjectUrl = undefined
    }

    // Set new source
    if (src instanceof Blob) {
      const u = URL.createObjectURL(src)
      this.currentObjectUrl = u
      this.audio.src = u
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
    } catch (e) {
      console.warn('Playback failed', e)
      // We don't emit error here necessarily as it might be an autoplay policy block
      // But 'error' event on audio element handles critical errors
    }
  }

  pause() {
    this.audio.pause()
  }

  toggle() {
    if (this.audio.paused) {
      this.play()
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
}

export const playerEngine = new PlayerEngineImpl()
