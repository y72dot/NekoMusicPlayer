export type TrackId = string

/**
 * URI format: neko://<source_id>/<type>/<resource_id>?<params>
 * Example: neko://file/track/C%3A%2FMusic%2FSong.mp3
 */
export type TrackUri = string

export interface Track {
  id: TrackId
  uri?: TrackUri
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