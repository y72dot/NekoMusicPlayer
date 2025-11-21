export type PlayMode = 'single' | 'loop' | 'shuffle'

export interface Settings {
  defaultVolume: number
  playMode: PlayMode
}