export type SourceType = 'localfs' | 'custom'

export type ProviderId = string

export type AudioFormat = 'mp3' | 'wav' | 'flac' | 'aac' | 'ogg' | 'unknown'

export type ID = string

export interface Track {
  id: ID
  title: string
  artist: string
  album: string
  albumArtist?: string
  trackNo?: number
  discNo?: number
  duration?: number
  year?: number
  genres?: string[]
  cover?: string
  format: AudioFormat
  bitrate?: number
  sampleRate?: number
  channels?: number
  sourceType: SourceType
  sourceRef: {
    providerId: ProviderId
    pathOrKey: string
    url?: string
  }
}

export interface Playlist {
  id: ID
  name: string
  trackIds: ID[]
  createdAt: number
  updatedAt: number
}

export interface PlaybackState {
  currentTrackId?: ID
  isPlaying: boolean
  volume: number
  muted: boolean
  position: number
  repeatMode: 'off' | 'one' | 'all'
  shuffle: boolean
  queue: ID[]
}

export interface SourceProvider {
  id: ProviderId
  type: SourceType
  name: string
  connect(): Promise<void>
  listAudioFilesRecursively(root: string): Promise<string[]>
  readFile(path: string): Promise<Blob>
}

