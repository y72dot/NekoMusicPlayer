import create from 'zustand'
import { persist } from 'zustand/middleware'
import type { Track } from '../providers/types'

type State = {
  tracks: Record<string, Track>
  order: string[]
}

type Actions = {
  upsertTracks: (items: Track[]) => void
}

export const useLibrary = create<State & Actions>()(persist((set, get) => ({
  tracks: {},
  order: [],
  upsertTracks(items) {
    const tracks = { ...get().tracks }
    const order = [...get().order]
    for (const t of items) {
      tracks[t.id] = t
      if (!order.includes(t.id)) order.push(t.id)
    }
    set({ tracks, order })
  }
}), { name: 'library' }))
