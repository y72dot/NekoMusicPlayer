import create from 'zustand'
import { persist } from 'zustand/middleware'
import type { PlaybackState, ID, Track } from '../providers/types'
import { audio, setSource, play, pause, seek, setVolume, setMuted } from '../services/audio/PlayerCore'
import { buildTrackFromBlob } from '../services/metadata/metadata'
import { useLibrary } from './library'
import { getBlob, putBlob } from '../services/cache/indexeddb'
import { getProvider } from '../providers/registry'
function delay(ms: number) { return new Promise(r => setTimeout(r, ms)) }
async function writeDurationToLibrary(id: ID) {
  for (let i = 0; i < 15; i++) {
    await delay(100)
    const dur = audio.duration
    if (isFinite(dur) && dur > 0) {
      const t = useLibrary.getState().tracks[id]
      if (!t) return
      const val = Math.floor(dur)
      if (!t.duration || Math.abs((t.duration || 0) - val) >= 1) {
        useLibrary.getState().upsertTracks([{ ...t, duration: val } as Track])
      }
      return
    }
  }
}

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
      writeDurationToLibrary(id)
    } else {
      const cached = await getBlob('audioBlobs', id)
      if (cached) await setSource(cached)
      else {
        const provider = getProvider(track.sourceRef.providerId)
        if (provider) {
          const dl = await provider.readFile(track.sourceRef.pathOrKey)
          await putBlob('audioBlobs', id, dl)
          await setSource(dl)
          writeDurationToLibrary(id)
          try {
            const name = track.sourceRef.pathOrKey.split('/').pop() || 'audio'
            const parsed = await buildTrackFromBlob({ blob: dl, name, providerId: track.sourceRef.providerId, pathOrKey: track.sourceRef.pathOrKey, sourceType: track.sourceType })
            const merged = { ...track }
            for (const k of ['title','artist','album','albumArtist','trackNo','discNo','duration','year','genres','cover','format','bitrate','sampleRate','channels'] as const) {
              const v = (parsed as any)[k]
              if (v != null && (typeof v === 'number' ? v > 0 : String(v).length > 0)) (merged as any)[k] = v
            }
            useLibrary.getState().upsertTracks([merged as any])
          } catch {}
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
    if (blob) {
      await setSource(blob)
      try {
        const name = track.sourceRef.pathOrKey.split('/').pop() || 'audio'
        const parsed = await buildTrackFromBlob({ blob, name, providerId: track.sourceRef.providerId, pathOrKey: track.sourceRef.pathOrKey, sourceType: track.sourceType })
        const merged = { ...track }
        for (const k of ['title','artist','album','albumArtist','trackNo','discNo','duration','year','genres','cover','format','bitrate','sampleRate','channels'] as const) {
          const v = (parsed as any)[k]
          if (v != null && (typeof v === 'number' ? v > 0 : String(v).length > 0)) (merged as any)[k] = v
        }
        useLibrary.getState().upsertTracks([merged as any])
      } catch {}
      writeDurationToLibrary(id)
    }
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
