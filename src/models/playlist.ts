import type { Track } from '@/models/track'

export type PlaylistId = string

export interface Playlist {
  id: PlaylistId
  name: string
  tracks: Track[]
  createdAt: number
  updatedAt: number
}