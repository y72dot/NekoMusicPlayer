import { useEffect, useMemo, useState } from 'react'
import { FixedSizeList as VList } from 'react-window'
import PlaylistPanel from './components/PlaylistPanel'
import NowPlaying from './components/NowPlaying'
import PlayerBar from './components/PlayerBar'
import SettingsPanel from './components/SettingsPanel'
import { useLibrary } from './stores/library'
import { usePlaylists } from './stores/playlists'
import { usePlayer } from './stores/player'
import { getBlob, putBlob } from './services/cache/indexeddb'
import { useAudioState } from './services/audio/PlayerCore'

export default function App() {
  const lib = useLibrary()
  const p = usePlaylists()
  const player = usePlayer()
  const audioState = useAudioState()
  const [tab, setTab] = useState<'playlist'|'settings'|'player'>('playlist')

  const rows = useMemo(() => {
    if (!p.currentPlaylistId || p.currentPlaylistId === '__all__') return lib.order.map(id => lib.tracks[id])
    return p.playlists[p.currentPlaylistId]?.trackIds.map(id => lib.tracks[id]).filter(Boolean) || []
  }, [lib.tracks, lib.order, p.currentPlaylistId, p.playlists])

  useEffect(() => {
    player.setQueue(rows.map(r => r.id))
  }, [rows.length])

  async function onRowDoubleClick(id: string) {
    const blob = await getBlob('audioBlobs', id)
    await player.loadTrack(id, blob || undefined)
  }

  useEffect(() => {
    const id = player.currentTrackId
    if (!id) return
    ;(async () => {
      const blob = await getBlob('audioBlobs', id)
      await player.loadTrackWithoutPlay(id, blob || undefined)
      if (player.position > 0) player.seek(player.position)
    })()
  }, [])

  useEffect(() => {
    const dur = audioState.duration
    const pos = player.position
    if (!player.currentTrackId || !dur || pos / dur < 0.8) return
    const idx = player.queue.indexOf(player.currentTrackId)
    const nextId = player.queue[idx + 1]
    if (!nextId) return
    ;(async () => {
      const exists = await getBlob('audioBlobs', nextId)
      if (exists) return
      const next = lib.tracks[nextId]
      if (!next) return
      const localfs: any = (window as any).__localfs
      if (next.sourceType === 'localfs' && localfs) {
        const blob = await localfs.readFile(next.sourceRef.pathOrKey)
        await putBlob('audioBlobs', nextId, blob)
      }
    })()
  }, [audioState.duration, player.position, player.currentTrackId])

  function onDragStart(e: React.DragEvent<HTMLTableRowElement>, index: number) {
    e.dataTransfer.setData('text/plain', String(index))
  }
  function onDragOver(e: React.DragEvent<HTMLTableRowElement>) { e.preventDefault() }
  function onDrop(e: React.DragEvent<HTMLTableRowElement>, index: number) {
    e.preventDefault()
    if (!p.currentPlaylistId) return
    const from = parseInt(e.dataTransfer.getData('text/plain'))
    if (!Number.isFinite(from)) return
    p.reorderPlaylist(p.currentPlaylistId, from, index)
  }

  const [query, setQuery] = useState('')
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return rows
    return rows.filter(t => (t.title || '').toLowerCase().includes(q) || (t.artist || '').toLowerCase().includes(q) || (t.album || '').toLowerCase().includes(q))
  }, [rows, query])

  return (
    <div className="app">
      <div className="topbar">
        <div className="tabs">
          <button className={tab==='playlist' ? 'tab active' : 'tab'} onClick={() => setTab('playlist')}>歌单管理</button>
          <button className={tab==='settings' ? 'tab active' : 'tab'} onClick={() => setTab('settings')}>设置</button>
          <button className={tab==='player' ? 'tab active' : 'tab'} onClick={() => setTab('player')}>播放器</button>
        </div>
      </div>
      <div className={tab==='playlist' ? 'layout layout-3 view' : 'layout layout-1 view'}>
        {tab==='playlist' && (
          <>
            <PlaylistPanel />
            <div className="panel">
              <div className="list">
                <div className="row" style={{ padding: '8px 12px' }}>
                  <input placeholder="搜索" style={{ flex: 1 }} value={query} onChange={e => setQuery(e.target.value)} />
                </div>
                <table>
                  <thead>
                  <tr>
                    <th style={{ width: 32 }}>#</th>
                    <th>歌曲</th>
                    <th>艺术家</th>
                    <th>专辑</th>
                    <th style={{ width: 80 }}>时长</th>
                    <th style={{ width: 80 }}>操作</th>
                  </tr>
                  </thead>
                </table>
                <VList height={window.innerHeight - 200} itemCount={filtered.length} itemSize={40} width={'100%'}>
                  {({ index, style }: any) => {
                    const t = filtered[index]
                    return (
                      <div style={style} key={t.id}>
                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                          <tbody>
                          <tr className="drag" draggable={!!p.currentPlaylistId}
                              onDragStart={e => onDragStart(e, index)} onDragOver={onDragOver} onDrop={e => onDrop(e, index)}
                              onDoubleClick={() => onRowDoubleClick(t.id)}>
                            <td style={{ width: 32, padding: '8px 12px', borderBottom: '1px solid var(--border)' }}>{index + 1}</td>
                            <td style={{ padding: '8px 12px', borderBottom: '1px solid var(--border)' }}>{t.title}</td>
                            <td className="muted" style={{ padding: '8px 12px', borderBottom: '1px solid var(--border)' }}>{t.artist}</td>
                            <td className="muted" style={{ padding: '8px 12px', borderBottom: '1px solid var(--border)' }}>{t.album}</td>
                            <td className="muted" style={{ width: 80, padding: '8px 12px', borderBottom: '1px solid var(--border)' }}>{Math.round((t.duration || 0) / 60)}:{String(Math.round((t.duration || 0) % 60)).padStart(2, '0')}</td>
                            <td style={{ width: 80, padding: '8px 12px', borderBottom: '1px solid var(--border)' }}>
                              <button className="btn" onClick={() => player.loadTrackWithoutPlay(t.id)}>编辑</button>
                            </td>
                          </tr>
                          </tbody>
                        </table>
                      </div>
                    )
                  }}
                </VList>
              </div>
            </div>
            <NowPlaying />
          </>
        )}
        {tab==='settings' && (
          <SettingsPanel />
        )}
        {tab==='player' && (
          <div className="panel">
            <NowPlaying />
          </div>
        )}
      </div>
      <PlayerBar />
    </div>
  )
}
