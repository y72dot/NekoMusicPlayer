import { playerEngine } from '@/core/playerEngine'
import { usePlayerStore } from '@/store/player'
import { useSettingsStore } from '@/store/settings'
import { useToastStore } from '@/store/toast'

export function setupPlayerBridge() {
  const player = usePlayerStore()
  const settings = useSettingsStore()
  const toast = useToastStore()

  // Sync Engine -> Store
  playerEngine.on('timeupdate', ({ currentTime, duration }) => {
    player.setProgress(currentTime, duration)
  })

  playerEngine.on('play', () => player.setPlaying(true))
  playerEngine.on('pause', () => player.setPlaying(false))

  playerEngine.on('ended', () => {
    player.onTrackEnded()
  })

  playerEngine.on('error', () => {
    toast.error('音频播放出错，请检查文件是否有效')
  })

  // Two-way volume sync
  playerEngine.on('volumechange', (v) => {
    player.setVolume(v)
  })

  playerEngine.setVolume(settings.settings.defaultVolume)
}
