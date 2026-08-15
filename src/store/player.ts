import { defineStore } from 'pinia'
import type { Track } from '@/models/track'
import type { PlayMode } from '@/models/settings'
import { useSettingsStore } from '@/store/settings'
import { usePlaylistsStore } from '@/store/playlists'
import { useToastStore } from '@/store/toast'
import { playerEngine } from '@/core/playerEngine'
import type { PlaybackStatus } from '@/core/playerEngine'
import { normalizePlaybackError, type PlaybackError } from '@/core/playbackError'

export const usePlayerStore = defineStore('player', {
  state: () => ({
    queue: [] as Track[],
    index: 0,
    volume: useSettingsStore().settings.defaultVolume,
    mode: useSettingsStore().settings.playMode as PlayMode,
    playing: false,
    currentTime: 0,
    duration: 0,
    status: 'idle' as PlaybackStatus,
    lastError: undefined as PlaybackError | undefined,
    failedTrackIds: [] as string[],
  }),
  getters: {
    current(state) {
      return state.index >= 0 ? state.queue[state.index] : undefined
    },
  },
  actions: {
    async setQueue(tracks: Track[], startIndex = 0) {
      this.queue = [...tracks]
      this.index = tracks.length ? Math.max(0, Math.min(startIndex, tracks.length - 1)) : 0
      // persistIndex handled by plugin
      if (this.current) {
        await this.loadCurrent()
      }
    },

    async loadCurrent(): Promise<boolean> {
      if (!this.current) return false
      try {
        this.lastError = undefined
        return await playerEngine.load(this.current)
      } catch {
        return false
      }
    },
    
    async reorder(from: number, to: number) {
      if (from < 0 || from >= this.queue.length || to < 0 || to >= this.queue.length) return
      
      const [moved] = this.queue.splice(from, 1)
      this.queue.splice(to, 0, moved)
      
      // Update index
      if (this.index === from) {
        this.index = to
      } else if (this.index > from && this.index <= to) {
        this.index--
      } else if (this.index < from && this.index >= to) {
        this.index++
      }
    },
    
    async play(track?: Track) {
      if (track) {
        try {
          const loaded = await playerEngine.load(track)
          if (loaded) await playerEngine.play()
        } catch (cause) {
          await this.recoverFromError(normalizePlaybackError(cause, 'play'))
        }
      } else if (this.current) {
        try {
          if (playerEngine.currentTrack?.id !== this.current.id) {
            const loaded = await playerEngine.load(this.current)
            if (!loaded) return
          }
          if (playerEngine.paused) await playerEngine.play()
        } catch (cause) {
          await this.recoverFromError(normalizePlaybackError(cause, 'play'))
        }
      } else if (this.queue.length === 0) {
        // Smart Play: queue is empty, try to load from library
        const playlists = usePlaylistsStore()
        if (playlists.library.length > 0) {
          await this.setQueue(playlists.library, 0)
          await this.play()
          return
        }
      }
    },

    pause() {
      playerEngine.pause()
    },

    async toggle() {
      // Ignore repeated transport clicks while the current source is resolving.
      // Starting another resolution cannot make the upstream respond sooner and
      // used to create a burst of identical requests after a transient timeout.
      if (this.status === 'loading') return
      if (!this.current && this.queue.length === 0) {
        const playlists = usePlaylistsStore()
        if (playlists.library.length > 0) {
          await this.setQueue(playlists.library, 0)
          await this.play()
          return
        }
        useToastStore().warning('音乐库为空，请先导入歌曲')
        return
      }
      // If engine doesn't have the current track (e.g. after refresh), load and play
      if (this.current && playerEngine.currentTrack?.id !== this.current.id) {
        await this.play()
        return
      }
      try {
        await playerEngine.toggle()
      } catch (cause) {
        await this.recoverFromError(normalizePlaybackError(cause, 'play'))
      }
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

    setStatus(status: PlaybackStatus) {
      this.status = status
      if (status !== 'error') this.lastError = undefined
    },

    setError(error: PlaybackError) {
      this.lastError = error
      this.status = 'error'
      this.playing = false
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
      await this.play()
    },
    
    async prev() {
      if (!this.queue.length) return
      if (this.mode === 'shuffle') {
        this.index = Math.floor(Math.random() * this.queue.length)
      } else {
        this.index = (this.index - 1 + this.queue.length) % this.queue.length
      }
      await this.play()
    },

    async onTrackEnded() {
      this.failedTrackIds = []
      if (this.mode === 'single') {
        if (this.current) {
           playerEngine.seek(0)
           await playerEngine.play()
        }
      } else {
        await this.next()
      }
    },

    async recoverFromError(error: PlaybackError) {
      this.setError(error)
      const current = this.current
      if (!current || this.queue.length < 2 || error.code === 'AUTOPLAY_BLOCKED') return

      // A timeout, network outage or rate limit normally affects the whole
      // source. Skipping recursively only repeats the same failing request for
      // every queue item and turns one transient failure into an error storm.
      if (error.retryable) return

      if (this.failedTrackIds.includes(current.id)) return
      this.failedTrackIds.push(current.id)
      if (this.failedTrackIds.length >= this.queue.length) return
      await this.next()
    },

    async playNext(track: Track) {
      if (this.status === 'loading' && this.current?.id === track.id) return
      if (this.queue.length === 0) {
        // If queue is empty, just play it
        await this.setQueue([track], 0)
        await this.play()
      } else {
        // Check if exists
        const existingIndex = this.queue.findIndex(t => t.id === track.id)
        if (existingIndex !== -1) {
          // If it's already playing, do nothing
          if (existingIndex === this.index) {
             return
          }
          
          this.queue.splice(existingIndex, 1)
          // If removed from before current index, decrement index
          if (existingIndex < this.index) {
            this.index--
          }
        }
        
        // Insert after current index
        const nextIndex = this.index + 1
        this.queue.splice(nextIndex, 0, track)
        // Play the new track
        this.index = nextIndex
        
        if (this.current) {
          const loaded = await this.loadCurrent()
          if (loaded) await playerEngine.play().catch(() => {})
        }
      }
    },

    updateTrack(track: Track) {
      const idx = this.queue.findIndex(t => t.id === track.id)
      if (idx >= 0) {
        this.queue[idx] = { ...this.queue[idx], ...track }
      }
    },

    add(track: Track) {
      // Check if exists
      const existingIndex = this.queue.findIndex(t => t.id === track.id)
      if (existingIndex !== -1) {
        // If it's current playing, do nothing to avoid stopping playback
        if (existingIndex === this.index) {
           return
        }
        
        this.queue.splice(existingIndex, 1)
        if (existingIndex < this.index) {
          this.index--
        }
      }
      this.queue.push(track)
    },

    async remove(index: number) {
      if (index < 0 || index >= this.queue.length) return
      
      const isCurrent = index === this.index
      const isBefore = index < this.index
      
      this.queue.splice(index, 1)
      
      if (isBefore) {
        this.index--
      } else if (isCurrent) {
        // If we removed the current track
        if (this.queue.length === 0) {
           this.index = 0
           this.pause()
        } else {
           // If we were at the end, go to new last (or loop to 0)
           // For simplicity, if we remove last playing track, we wrap to 0 or stop?
           // Usually, playing next one (which is now at same index) is good.
           // Unless index is now out of bounds.
           if (this.index >= this.queue.length) {
             this.index = 0
           }
           
           if (this.current) {
             const shouldResume = this.playing
             const loaded = await this.loadCurrent()
             if (loaded && shouldResume) await playerEngine.play().catch(() => {})
           }
        }
      }
      // If removed track was after current, index stays same, nothing to do.
    },
    
    async removeTracks(indexes: number[]) {
      // Sort indexes descending to remove without shifting affecting subsequent indexes
      const sorted = [...indexes].sort((a, b) => b - a)
      let newIndex = this.index
      let currentRemoved = false
      
      sorted.forEach(i => {
        if (i < 0 || i >= this.queue.length) return
        
        if (i < this.index) {
          newIndex--
        } else if (i === this.index) {
          currentRemoved = true
        }
        this.queue.splice(i, 1)
      })
      
      if (this.queue.length === 0) {
        this.index = 0
        this.pause()
        return
      }
      
      if (currentRemoved) {
        // Current track removed, play the one that took its place (or wrap)
        if (newIndex >= this.queue.length) newIndex = 0
        this.index = newIndex
        
        if (this.current) {
          const shouldResume = this.playing
          const loaded = await this.loadCurrent()
          if (loaded && shouldResume) await playerEngine.play().catch(() => {})
        }
      } else {
        // Just update index if it shifted
        this.index = newIndex
      }
    }
  },
  persist: {
    key: 'neko.player.v1.state',
    storage: localStorage,
    paths: ['index', 'queue'],
  },
})
