import { playerEngine } from '@/core/playerEngine'
import { usePlayerStore } from '@/store/player'
import { useSettingsStore } from '@/store/settings'

export function setupPlayerBridge() {
  const player = usePlayerStore()
  const settings = useSettingsStore()

  // Sync Engine -> Store
  playerEngine.on('timeupdate', ({ currentTime, duration }) => {
    player.setProgress(currentTime, duration)
  })

  playerEngine.on('play', () => player.setPlaying(true))
  playerEngine.on('pause', () => player.setPlaying(false))

  playerEngine.on('ended', () => {
    // Delegate to store action which handles mode logic
    player.onTrackEnded()
  })

  // We could also listen to volumechange if we want two-way binding for volume UI
  // playerEngine.on('volumechange', (v) => player.setVolume(v)) 
  // But currently UI calls store.setVolume -> engine.setVolume. 
  // If engine volume changes internally (unlikely), store might get out of sync. 
  // For now, this is fine.

  // Initial Sync Store -> Engine
  // We need to set initial volume.
  playerEngine.setVolume(settings.settings.defaultVolume)
}
