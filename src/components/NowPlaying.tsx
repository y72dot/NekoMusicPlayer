import { useLibrary } from '../stores/library'
import { usePlayer } from '../stores/player'
import { useState, useMemo, useEffect } from 'react'
import { enrichByMusicBrainz } from '../services/metadata/musicbrainz'

export default function NowPlaying() {
  const lib = useLibrary()
  const player = usePlayer()
  const track = player.currentTrackId ? lib.tracks[player.currentTrackId] : undefined
  const [form, setForm] = useState(() => track)
  useEffect(() => { setForm(track) }, [player.currentTrackId, track?.id])
  function startResize(e: React.MouseEvent<HTMLDivElement>) {
    e.preventDefault()
    const startX = e.clientX
    const startW = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--right-width')) || 320
    function onMove(ev: MouseEvent) {
      const dx = startX - ev.clientX
      const w = Math.min(520, Math.max(260, startW + dx))
      document.documentElement.style.setProperty('--right-width', `${w}px`)
    }
    function onUp() {
      const w = getComputedStyle(document.documentElement).getPropertyValue('--right-width').trim()
      try { localStorage.setItem('layout.rightWidth', w) } catch {}
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }

  if (!track) return <div className="panel right" style={{ padding: 12 }}><div className="resizer resizer-left" onMouseDown={startResize} />未选择曲目</div>

  function save() {
    lib.upsertTracks([{ ...track, ...form } as any])
  }
  async function autoFill() {
    const r = await enrichByMusicBrainz({ title: form?.title, artist: form?.artist, album: form?.album })
    setForm({ ...form!, ...r })
  }

  return (
    <div className="panel right">
      {track.cover ? <img className="cover" src={track.cover} /> : <div className="cover" />}
      <div style={{ padding: 12 }} className="col">
        <label className="col">
          <span className="muted">歌名</span>
          <input value={form?.title || ''} onChange={e => setForm({ ...form!, title: e.target.value })} />
        </label>
        <label className="col">
          <span className="muted">艺术家</span>
          <input value={form?.artist || ''} onChange={e => setForm({ ...form!, artist: e.target.value })} />
        </label>
        <label className="col">
          <span className="muted">专辑</span>
          <input value={form?.album || ''} onChange={e => setForm({ ...form!, album: e.target.value })} />
        </label>
        <div className="row" style={{ gap: 8 }}>
          <button className="btn" onClick={autoFill}>自动补全</button>
          <button className="btn" onClick={save}>保存元数据</button>
        </div>
      </div>
      <div className="resizer resizer-left" onMouseDown={startResize} />
    </div>
  )
}
