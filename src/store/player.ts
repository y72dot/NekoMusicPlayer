import { defineStore } from 'pinia'
import type { Track } from '@/models/track'
import type { PlayMode } from '@/models/settings'
import { useSettingsStore } from '@/store/settings'
import { usePlaylistsStore } from '@/store/playlists'
import { playerEngine } from '@/core/playerEngine'

export const usePlayerStore = defineStore('player', {
  state: () => ({
    queue: [] as Track[],
    index: 0,
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
    async setQueue(tracks: Track[], startIndex = 0) {
      this.queue = [...tracks]
      this.index = startIndex
      // persistIndex handled by plugin
      if (this.current) {
        await playerEngine.load(this.current)
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
        await playerEngine.load(track)
      } else if (this.current) {
        // If engine's current track is different from store's current, force load
        if (playerEngine.currentTrack?.id !== this.current.id) {
           await playerEngine.load(this.current)
        }
        
        // If paused, play
        if (playerEngine.paused) await playerEngine.play()
      }
    },

    pause() {
      playerEngine.pause()
    },

    async toggle() {
      if (!this.current && this.queue.length === 0) {
        // Smart Play: if queue is empty, try to load library
        const playlists = usePlaylistsStore()
        if (playlists.library.length > 0) {
          await this.setQueue(playlists.library, 0)
          await this.play()
          return
        }
      }
      playerEngine.toggle()
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
      if (this.mode === 'single') {
        if (this.current) {
           playerEngine.seek(0)
           await playerEngine.play()
        }
      } else {
        await this.next()
      }
    },

    async playNext(track: Track) {
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
          await playerEngine.load(this.current)
          await playerEngine.play()
        }
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
             await playerEngine.load(this.current)
             if (this.playing) await playerEngine.play()
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
          await playerEngine.load(this.current)
          if (this.playing) await playerEngine.play()
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
    pick: ['index', 'queue'],
  },
})
