export type PlayMode = 'single' | 'loop' | 'shuffle'

export interface Settings {
  defaultVolume: number
  playMode: PlayMode
  neteaseCookie: string
  neteaseCsrf: string
  bilibiliSessdata: string
  bilibiliCsrf: string
  bilibiliBuvid3: string
}