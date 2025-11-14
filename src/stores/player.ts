import create from 'zustand'
import { persist } from 'zustand/middleware'
import type { PlaybackState, ID, Track } from '../providers/types'
import { audio, setSource, play, pause, seek, setVolume, setMuted } from '../services/audio/PlayerCore'
import { useLibrary } from './library'
import { getBlob, putBlob } from '../services/cache/indexeddb'
import { getProvider } from '../providers/registry'

type Actions = {
  loadTrack: (id: ID, blob?: Blob | string) => Promise<void>
  loadTrackWithoutPlay: (id: ID, blob?: Blob | string) => Promise<void>
  toggle: () => void
  next: () => void
  prev: () => void
  setVolume: (v: number) => void
  setMuted: (m: boolean) => void
  seek: (pos: number) => void
  setQueue: (ids: ID[]) => void
  setRepeat: (m: PlaybackState['repeatMode']) => void
  setShuffle: (s: boolean) => void
}

export const usePlayer = create<PlaybackState & Actions>()(persist((set, get) => ({
  currentTrackId: undefined,
  isPlaying: false,
  volume: 1,
  muted: false,
  position: 0,
  repeatMode: 'off',
  shuffle: false,
  queue: [],
  async loadTrack(id, blob) {
    const track = useLibrary.getState().tracks[id]
    if (!track) return
    if (blob) {
      await setSource(blob)
    } else {
      const cached = await getBlob('audioBlobs', id)
      if (cached) await setSource(cached)
      else {
        const provider = getProvider(track.sourceRef.providerId)
        if (provider) {
          const dl = await provider.readFile(track.sourceRef.pathOrKey)
          await putBlob('audioBlobs', id, dl)
          await setSource(dl)
        }
      }
    }
    set({ currentTrackId: id })
    await play()
    set({ isPlaying: true })
    try {
      const recent: ID[] = JSON.parse(localStorage.getItem('recent') || '[]')
      const next = [id, ...recent.filter(x => x !== id)].slice(0, 200)
      localStorage.setItem('recent', JSON.stringify(next))
    } catch {}
  },
  async loadTrackWithoutPlay(id, blob) {
    const track = useLibrary.getState().tracks[id]
    if (!track) return
    if (blob) await setSource(blob)
    set({ currentTrackId: id, isPlaying: false })
    pause()
  },
  toggle() {
    if (audio.paused) play()
    else pause()
    set({ isPlaying: !audio.paused })
  },
  next() {
    const { queue, currentTrackId, repeatMode } = get()
    if (!currentTrackId) return
    const idx = queue.indexOf(currentTrackId)
    if (repeatMode === 'one') return seek(0)
    const next = queue[idx + 1]
    if (!next) {
      if (repeatMode === 'all' && queue.length) get().loadTrack(queue[0])
      return
    }
    get().loadTrack(next)
  },
  prev() {
    const { queue, currentTrackId } = get()
    if (!currentTrackId) return
    const idx = queue.indexOf(currentTrackId)
    const prev = queue[idx - 1]
    if (prev) get().loadTrack(prev)
    else seek(0)
  },
  setVolume(v) { setVolume(v); set({ volume: v }) },
  setMuted(m) { setMuted(m); set({ muted: m }) },
  seek(pos) { seek(pos); set({ position: pos }) },
  setQueue(ids) { set({ queue: ids }) },
  setRepeat(m) { set({ repeatMode: m }) },
  setShuffle(s) { set({ shuffle: s }) }
}), { name: 'player' }))
