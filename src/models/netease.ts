export interface NeteaseArtist {
  id: number
  name: string
}

export interface NeteaseAlbum {
  id: number
  name: string
  picUrl: string
}

export interface NeteaseSong {
  id: number
  name: string
  ar: NeteaseArtist[]
  al: NeteaseAlbum
  dt: number
}

export interface NeteaseSongDetail {
  code: number
  songs: NeteaseSong[]
}

export interface NeteaseSongUrlItem {
  id: number
  url: string | null
  br: number
  size: number
  type: string
}

export interface NeteaseSongUrl {
  code: number
  data: NeteaseSongUrlItem[]
}

export interface NeteasePlaylistDetail {
  code: number
  playlist: {
    id: number
    name: string
    trackIds: Array<{ id: number }>
    tracks: NeteaseSong[]
  }
}

export interface NeteaseAlbumDetail {
  code: number
  album: {
    id: number
    name: string
  }
  songs: NeteaseSong[]
}

export interface NeteaseSearchResult {
  code: number
  result: {
    songCount: number
    songs: NeteaseSong[]
  }
}

export interface NeteaseAccountInfo {
  code: number
  profile?: {
    userId: number
    nickname: string
  }
}
