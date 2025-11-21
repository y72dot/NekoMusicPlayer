export type TrackId = string

export interface Track {
  id: TrackId
  title: string
  artist?: string
  album?: string
  coverUrl?: string
  duration?: number
  sourceId: string
  sourceRef: unknown
  url?: string
  format?: string
}