import { playerEngine } from '@/core/playerEngine'
import { usePlayerStore } from '@/store/player'
import { usePlaylistsStore } from '@/store/playlists'
import { useSettingsStore } from '@/store/settings'
import { useToastStore } from '@/store/toast'

export function setupPlayerBridge() {
  const player = usePlayerStore()
  const playlists = usePlaylistsStore()
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

  playerEngine.on('error', (error) => {
    const interruptedPlayback = player.playing
    toast.error(error.message)
    player.setError(error)
    if (interruptedPlayback) void player.recoverFromError(error)
  })

  playerEngine.on('statuschange', (status) => player.setStatus(status))

  // Sync enriched track metadata to stores
  playerEngine.on('trackenriched', (track) => {
    player.updateTrack(track)
    playlists.updateTrack(track)
  })

  // Two-way volume sync
  playerEngine.on('volumechange', (v) => {
    player.setVolume(v)
  })

  playerEngine.setVolume(settings.settings.defaultVolume)
}
