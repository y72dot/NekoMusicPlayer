import { useEffect, useState } from 'react'
import { usePlayer } from '../stores/player'
import { useAudioState, getBufferedEnd } from '../services/audio/PlayerCore'
import { formatTime } from '../utils/time'
import { useLibrary } from '../stores/library'

export default function PlayerBar({ playingEnabled = true }: { playingEnabled?: boolean }) {
  const player = usePlayer()
  const lib = useLibrary()
  const audio = useAudioState()
  const [seeking, setSeeking] = useState<number | null>(null)
  const pos = seeking ?? audio.position
  const buffered = getBufferedEnd()
  const track = player.currentTrackId ? lib.tracks[player.currentTrackId] : undefined

  useEffect(() => {
    const savedVol = player.volume
    if (savedVol != null) player.setVolume(savedVol)
  }, [])

  function toggleRepeat() {
    const next = player.repeatMode === 'off' ? 'one' : player.repeatMode === 'one' ? 'all' : 'off'
    player.setRepeat(next as any)
  }

  return (
    <div className="controls">
      <div className="row" style={{ gap: 8 }}>
        <button className="btn" disabled={!playingEnabled} onClick={() => player.prev()}>上一首</button>
        <button className="btn" disabled={!playingEnabled} onClick={() => player.toggle()}>{player.isPlaying ? '暂停' : '播放'}</button>
        <button className="btn" disabled={!playingEnabled} onClick={() => player.next()}>下一首</button>
        <button className="btn" disabled={!playingEnabled} onClick={() => player.setShuffle(!player.shuffle)}>{player.shuffle ? '随机' : '顺序'}</button>
        <button className="btn" disabled={!playingEnabled} onClick={toggleRepeat}>{player.repeatMode === 'off' ? '循环关' : player.repeatMode === 'one' ? '单曲循环' : '列表循环'}</button>
      </div>
      <div className="row" style={{ gap: 12, alignItems: 'center' }}>
        <span className="muted" style={{ width: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{track ? `${track.title || ''} – ${track.artist || ''}` : ''}</span>
        <span className="muted" style={{ width: 60, textAlign: 'right' }}>{formatTime(pos)}</span>
        <input
          className="slider"
          type="range"
          min={0}
          max={Math.max(1, audio.duration)}
          step={0.1}
          value={pos}
          disabled={!playingEnabled}
          onChange={e => setSeeking(parseFloat(e.target.value))}
          onMouseUp={() => { if (seeking != null) { player.seek(seeking); setSeeking(null) } }}
          onTouchEnd={() => { if (seeking != null) { player.seek(seeking); setSeeking(null) } }}
        />
        <span className="muted" style={{ width: 60 }}>{formatTime(audio.duration)}</span>
      </div>
      <div className="row" style={{ justifyContent: 'flex-end', gap: 8 }}>
        <span className="muted">音量</span>
        <input className="slider" style={{ maxWidth: 160 }} type="range" min={0} max={1} step={0.01} value={player.volume} disabled={!playingEnabled} onChange={e => player.setVolume(parseFloat(e.target.value))} />
        <button className="btn" disabled={!playingEnabled} onClick={() => player.setMuted(!player.muted)}>{player.muted ? '取消静音' : '静音'}</button>
      </div>
    </div>
  )
}
