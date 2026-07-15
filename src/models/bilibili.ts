export interface BilibiliOwner {
  mid: number
  name: string
  face?: string
}

export interface BilibiliPage {
  cid: number
  page: number
  part: string
  duration: number
}

export interface BilibiliVideoData {
  bvid: string
  aid: number
  title: string
  pic: string
  duration: number
  owner: BilibiliOwner
  pages: BilibiliPage[]
  cid: number
}

export interface BilibiliVideoInfo {
  code: number
  message?: string
  data: BilibiliVideoData
}

export interface BilibiliDashAudio {
  id: number
  baseUrl: string
  backupUrl: string[]
  bandWidth: number
  mimeType?: string
  codecid?: number
}

export interface BilibiliDash {
  audio: BilibiliDashAudio[]
  duration?: number
}

export interface BilibiliPlayurlResponse {
  dash: BilibiliDash
  accept_description: string[]
  accept_quality: number[]
  quality: number
}

export interface BilibiliPlayurlData {
  code: number
  message?: string
  data: BilibiliPlayurlResponse
}

export interface BilibiliAudioInfo {
  code: number
  message?: string
  data?: BilibiliVideoData
}

export interface BilibiliFavItem {
  id: number
  bvid: string
  title: string
  cover: string
  duration: number
  upper: BilibiliOwner
  cid: number
  page: number
}

export interface BilibiliFavList {
  code: number
  message?: string
  data: {
    medias: BilibiliFavItem[]
    has_more: boolean
  }
}

export interface BilibiliUserSpace {
  code: number
  message?: string
  data?: {
    mid: number
    name: string
    face?: string
  }
}
