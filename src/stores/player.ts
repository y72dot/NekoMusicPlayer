import create from 'zustand'
import { persist } from 'zustand/middleware'
import type { PlaybackState, ID, Track } from '../providers/types'
import { audio, setSource, play, pause, seek, setVolume, setMuted } from '../services/audio/PlayerCore'
import { buildTrackFromBlob } from '../services/metadata/metadata'
import { useLibrary } from './library'
import { getBlob, putBlob } from '../services/cache/indexeddb'
import { isFsSupported } from '../services/storage/fs'
import { useSettings } from './settings'
import { getProvider } from '../providers/registry'
import { devlog } from '@/utils/devlog'
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
    devlog('player', 'load', { id })
    const track = useLibrary.getState().tracks[id]
    if (!track) return
    if (blob) {
      await setSource(blob)
      devlog('player', 'setSource', { id, from: 'blob' })
      writeDurationToLibrary(id)
      try {
        const t = useLibrary.getState().tracks[id]
        if (!(t as any).uid) {
          const uid = await (await import('../utils/uid')).computeUid(blob)
          useLibrary.getState().upsertTracks([{ ...t, uid } as any])
        }
      } catch {}
    } else {
      const cached = await getBlob('audioBlobs', id)
      if (cached) {
        await setSource(cached)
        devlog('player', 'setSource', { id, from: 'cache' })
        try {
          const needs = !(track.title && track.artist) || !(track.album) || !(track.duration) || !(track.cover)
          if (needs) {
            const name = ((track as any).filename) || ((track as any).sourceRef?.pathOrKey?.split('/').pop()) || 'audio'
            const parsed = await buildTrackFromBlob({ blob: cached, name, providerId: (track as any).sourceRef?.providerId || 'custom', pathOrKey: (track as any).sourceRef?.pathOrKey || '', sourceType: (track as any).sourceType || 'custom' })
            const merged = { ...track }
            for (const k of ['title','artist','album','albumArtist','trackNo','discNo','duration','year','genres','cover','format','bitrate','sampleRate','channels'] as const) {
              const v = (parsed as any)[k]
              if (v != null && (typeof v === 'number' ? v > 0 : String(v).length > 0)) (merged as any)[k] = v
            }
            useLibrary.getState().upsertTracks([merged as any])
          }
          const t2 = useLibrary.getState().tracks[id]
          if (!(t2 as any).uid) {
            const uid = await (await import('../utils/uid')).computeUid(cached)
            useLibrary.getState().upsertTracks([{ ...t2, uid } as any])
          }
        } catch {}
      }
      else {
        let dl: Blob | null = null
        const sources: any[] = Array.isArray((track as any).sources) ? (track as any).sources : []
        if (sources.length) {
          const preferred = sources.find(s => s.primary) || sources[0]
          if (preferred.kind === 'indexeddb') {
            const b = await getBlob('audioBlobs', id)
            if (b) dl = b
          } else if (preferred.kind === 'fs') {
            const localfs: any = (window as any).__localfs
            if (localfs && preferred.locator) dl = await localfs.readFile(preferred.locator)
          } else {
            const provider = getProvider(preferred.providerId || (track as any).sourceRef?.providerId)
            if (provider && preferred.locator) dl = await provider.readFile(preferred.locator)
          }
        }
        if (!dl && (track as any).sourceRef) {
          const ref = (track as any).sourceRef
          const provider = getProvider(ref.providerId)
          if (provider) {
            try { dl = await provider.readFile(ref.pathOrKey) } catch {}
          } else if (ref.providerId === 'localfs') {
            const localfs: any = (window as any).__localfs
            if (localfs && isFsSupported()) {
              try { dl = await localfs.readFile(ref.pathOrKey) } catch {}
            }
          }
        }
        if (!dl) return
        const isLocal = ((track as any).sourceType === 'localfs') || ((sources[0]?.kind) === 'fs')
        const cacheLocal = !!useSettings.getState().preferences?.cacheLocalAudio
        if (!(isLocal && isFsSupported()) || cacheLocal) {
          await putBlob('audioBlobs', id, dl)
        }
        await setSource(dl)
        devlog('player', 'setSource', { id, from: 'dl' })
        writeDurationToLibrary(id)
        try {
          const name = ((track as any).filename) || ((track as any).sourceRef?.pathOrKey?.split('/').pop()) || 'audio'
          const parsed = await buildTrackFromBlob({ blob: dl, name, providerId: (track as any).sourceRef?.providerId || (sources[0]?.providerId) || 'localfs', pathOrKey: (track as any).sourceRef?.pathOrKey || (sources[0]?.locator) || '', sourceType: (track as any).sourceType || 'localfs' })
          const merged = { ...track }
          for (const k of ['title','artist','album','albumArtist','trackNo','discNo','duration','year','genres','cover','format','bitrate','sampleRate','channels'] as const) {
            const v = (parsed as any)[k]
            if (v != null && (typeof v === 'number' ? v > 0 : String(v).length > 0)) (merged as any)[k] = v
          }
          useLibrary.getState().upsertTracks([merged as any])
          const t3 = useLibrary.getState().tracks[id]
          if (!(t3 as any).uid) {
            const uid = await (await import('../utils/uid')).computeUid(dl)
            useLibrary.getState().upsertTracks([{ ...t3, uid } as any])
          }
        } catch {}
      }
    }
    set({ currentTrackId: id })
    try { await play() } catch {}
    set({ isPlaying: !audio.paused })
    devlog('player', 'play', { id, isPlaying: !audio.paused })
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
