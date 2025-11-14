import { useEffect, useMemo, useState } from 'react'
import { FixedSizeList as VList } from 'react-window'
import PlaylistPanel from './components/PlaylistPanel'
import NowPlaying from './components/NowPlaying'
import PlayerBar from './components/PlayerBar'
import SettingsPanel from './components/SettingsPanel'
import { useLibrary } from './stores/library'
import { usePlaylists } from './stores/playlists'
import { usePlayer } from './stores/player'
import { getBlob } from './services/cache/indexeddb'
import { useAudioState } from './services/audio/PlayerCore'
import { readJson } from './services/storage/fs'
import { extToFormat } from './services/metadata/metadata'
import { isFsSupported, loadRootHandleFromIDB, ensureNmpData, scheduleFlush } from './services/storage/fs'

export default function App() {
  const lib = useLibrary()
  const p = usePlaylists()
  const player = usePlayer()
  const audioState = useAudioState()
  const [tab, setTab] = useState<'playlist'|'settings'|'player'>('playlist')
  const [editing, setEditing] = useState(false)
  const [snapshot, setSnapshot] = useState<{ playlists: Record<string, any>; order: string[]; currentId?: string } | null>(null)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [lastIndex, setLastIndex] = useState<number | null>(null)
  const [sortKey, setSortKey] = useState<'title'|'artist'|'album'|'trackNo'|'duration'|'createdAt'>('title')
  const [sortDirection, setSortDirection] = useState<'asc'|'desc'>('asc')
  const [sortMode, setSortMode] = useState<'view'|'materialize'>('view')
  const [targetPlaylistId, setTargetPlaylistId] = useState<string | ''>('')
  const [addMode, setAddMode] = useState<'append'|'replace'>('append')
  const [dragActive, setDragActive] = useState(false)
  const [dragPreviewOrder, setDragPreviewOrder] = useState<string[] | null>(null)
  useEffect(() => {
    try {
      const lw = localStorage.getItem('layout.leftWidth')
      const rw = localStorage.getItem('layout.rightWidth')
      if (lw) document.documentElement.style.setProperty('--left-width', lw)
      if (rw) document.documentElement.style.setProperty('--right-width', rw)
    } catch {}
  }, [])

  function beginEdit() {
    const s = usePlaylists.getState()
    setSnapshot({ playlists: { ...s.playlists }, order: [...s.order], currentId: s.currentPlaylistId })
    setEditing(true)
  }
  function cancelEdit() {
    if (!snapshot) { setEditing(false); return }
    const arr = snapshot.order.map(id => snapshot.playlists[id]).filter(Boolean)
    try { usePlaylists.getState().importPlaylistsWithValidation(arr as any) } catch {}
    if (snapshot.currentId) try { usePlaylists.getState().setCurrent(snapshot.currentId as any) } catch {}
    setEditing(false)
    setSnapshot(null)
  }
  function saveEdit() { setEditing(false); setSnapshot(null) }

  useEffect(() => {
    ;(async () => {
      if (!isFsSupported()) return
      const flag = localStorage.getItem('nmp.fsRootSelected') === 'true'
      if (!flag) return
      const h = await loadRootHandleFromIDB()
      if (!h) return
      await ensureNmpData()
      try {
        const lib = await readJson<any>('library.json')
        const pls = await readJson<any>('playlists.json')
        if (lib && lib.version === 2) {
          const items: any[] = []
          for (const uid of Object.keys(lib.tracks || {})) {
            const core = lib.tracks[uid] || {}
            const m = core.meta || {}
            const src = (core.sources || [])[0] || {}
            const providerId = src.providerId || 'localfs'
            const pathOrKey = src.locator || core.filename || uid
            const title = m.title || core.filename || 'audio'
            const artist = m.artist || ''
            const album = m.album || ''
            const format = extToFormat(core.filename || pathOrKey)
            const t: any = {
              id: uid,
              uid,
              filename: core.filename,
              addedAt: core.addedAt,
              sources: core.sources || [],
              title,
              artist,
              album,
              duration: m.duration,
              format,
              sourceType: src.kind === 'fs' ? 'localfs' : 'custom',
              sourceRef: { providerId, pathOrKey }
            }
            items.push(t)
          }
          if (items.length) useLibrary.getState().upsertTracks(items)
        }
        if (pls && pls.version === 2) {
          const data = Object.keys(pls.playlists || {}).map(pid => {
            const p = pls.playlists[pid]
            return { id: p.id, name: p.name, trackIds: p.trackUids || [], createdAt: Date.now(), updatedAt: Date.now() }
          })
          if (data.length) usePlaylists.getState().importPlaylistsWithValidation(data)
        }
      } catch {}
    })()
  }, [])

  const rows = useMemo(() => {
    if (!p.currentPlaylistId || p.currentPlaylistId === '__all__') return lib.order.map(id => lib.tracks[id])
    return p.playlists[p.currentPlaylistId]?.trackIds.map(id => lib.tracks[id]).filter(Boolean) || []
  }, [lib.tracks, lib.order, p.currentPlaylistId, p.playlists])

  useEffect(() => {
    player.setQueue(rows.map((r: any) => r.uid || r.id))
  }, [rows.length])

  useEffect(() => {
    const unsub1 = useLibrary.subscribe(s => s.tracks, () => scheduleFlush())
    const unsub2 = useLibrary.subscribe(s => s.order, () => scheduleFlush())
    const unsub3 = usePlaylists.subscribe(s => s.playlists, () => scheduleFlush())
    const unsub4 = usePlaylists.subscribe(s => s.order, () => scheduleFlush())
    const unsub5 = usePlaylists.subscribe(s => s.currentPlaylistId, () => scheduleFlush())
    const unsub6 = usePlayer.subscribe(s => s.queue, () => scheduleFlush())
    return () => {
      try { unsub1() } catch {}
      try { unsub2() } catch {}
      try { unsub3() } catch {}
      try { unsub4() } catch {}
      try { unsub5() } catch {}
      try { unsub6() } catch {}
    }
  }, [])

  async function onRowDoubleClick(id: string) {
    const blob = await getBlob('audioBlobs', id)
    if (editing) {
      await player.loadTrackWithoutPlay(id, blob || undefined)
    } else {
      await player.loadTrack(id, blob || undefined)
    }
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
        try { await localfs.readFile(next.sourceRef.pathOrKey) } catch {}
      }
    })()
  }, [audioState.duration, player.position, player.currentTrackId])

  useEffect(() => {
    const id = player.currentTrackId
    const dur = audioState.duration
    if (!id || !dur) return
    const t = lib.tracks[id]
    if (!t) return
    const d = Math.floor(dur)
    const old = Math.floor(t.duration || 0)
    if (!old || Math.abs(old - d) >= 1) {
      lib.upsertTracks([{ ...t, duration: d }])
    }
  }, [audioState.duration, player.currentTrackId])

  function onDragStart(e: React.DragEvent<HTMLTableRowElement>, index: number) {
    if (!editing) return
    const ids = selectedIds.size ? Array.from(selectedIds) : [sorted[index].id]
    e.dataTransfer.setData('application/x-track-ids', JSON.stringify({ trackIds: ids, fromPlaylistId: p.currentPlaylistId || undefined }))
    e.dataTransfer.effectAllowed = 'move'
    setDragActive(true)
  }
  function onDragOver(e: React.DragEvent<HTMLTableRowElement>, index: number) {
    e.preventDefault()
    if (!editing) return
    const sel = new Set(selectedIds.size ? Array.from(selectedIds) : [])
    const allIds = sorted.map(x => x.id)
    const remain = allIds.filter(x => !sel.has(x))
    const to = Math.max(0, Math.min(remain.length, index))
    const block = allIds.filter(x => sel.has(x))
    const next = [...remain]
    next.splice(to, 0, ...block)
    setDragPreviewOrder(next)
  }
  function onDrop(e: React.DragEvent<HTMLTableRowElement>, index: number) {
    e.preventDefault()
    if (!editing || !p.currentPlaylistId) return
    const sel = new Set(selectedIds.size ? Array.from(selectedIds) : [])
    const allIds = sorted.map(x => x.id)
    const remain = allIds.filter(x => !sel.has(x))
    const to = Math.max(0, Math.min(remain.length, index))
    p.moveSelected(p.currentPlaylistId, Array.from(sel), to)
    setDragActive(false)
    setDragPreviewOrder(null)
  }
  function onDragEnd() { setDragActive(false); setDragPreviewOrder(null) }

  const [query, setQuery] = useState('')
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return rows
    return rows.filter(t => (t.title || '').toLowerCase().includes(q) || (t.artist || '').toLowerCase().includes(q) || (t.album || '').toLowerCase().includes(q))
  }, [rows, query])

  const sorted = useMemo(() => {
    const list = [...filtered]
    const k = sortKey
    const dir = sortDirection === 'desc' ? -1 : 1
    list.sort((a: any, b: any) => {
      const va = k === 'createdAt' ? 0 : (a?.[k] ?? (typeof a?.[k] === 'number' ? 0 : ''))
      const vb = k === 'createdAt' ? 0 : (b?.[k] ?? (typeof b?.[k] === 'number' ? 0 : ''))
      if (typeof va === 'number' && typeof vb === 'number') return (va - vb) * dir
      return String(va).localeCompare(String(vb)) * dir
    })
    return list
  }, [filtered, sortKey, sortDirection])

  const displayed = useMemo(() => {
    if (dragActive && dragPreviewOrder) return dragPreviewOrder.map(id => lib.tracks[id]).filter(Boolean)
    return sorted
  }, [dragActive, dragPreviewOrder, sorted, lib.tracks])

  function onRowClick(e: React.MouseEvent<HTMLTableRowElement>, index: number, id: string) {
    const s = new Set(selectedIds)
    if (e.shiftKey && lastIndex !== null) {
      const [start, end] = [Math.min(lastIndex, index), Math.max(lastIndex, index)]
      for (let i = start; i <= end; i++) s.add(sorted[i].id)
    } else if (e.ctrlKey || e.metaKey) {
      if (s.has(id)) s.delete(id); else s.add(id)
      setLastIndex(index)
    } else {
      s.clear(); s.add(id); setLastIndex(index)
    }
    setSelectedIds(s)
  }

  function clearSelection() { setSelectedIds(new Set()); setLastIndex(null) }

  function toggleSelectAll() {
    if (selectedIds.size === sorted.length && sorted.length > 0) { clearSelection() }
    else { setSelectedIds(new Set(sorted.map(x => x.id))) }
  }

  function toggleCheckbox(e: any, index: number, id: string) {
    if (e && e.stopPropagation) e.stopPropagation()
    const s = new Set(selectedIds)
    const shift = !!(e?.nativeEvent?.shiftKey)
    if (shift && lastIndex !== null) {
      const [start, end] = [Math.min(lastIndex, index), Math.max(lastIndex, index)]
      for (let i = start; i <= end; i++) s.add(sorted[i].id)
    } else {
      if (s.has(id)) s.delete(id); else s.add(id)
      setLastIndex(index)
    }
    setSelectedIds(s)
  }

  function applySort() {
    if (!p.currentPlaylistId || p.currentPlaylistId === '__all__') return
    p.sortPlaylist(p.currentPlaylistId, sortKey, sortDirection, sortMode)
  }

  function addSelectedToTarget() {
    if (!targetPlaylistId) return
    const ids = Array.from(selectedIds)
    p.addManyToPlaylist(targetPlaylistId, ids, addMode)
  }

  function removeSelectedFromCurrent() {
    if (!p.currentPlaylistId || p.currentPlaylistId === '__all__') return
    const ids = Array.from(selectedIds)
    p.removeManyFromPlaylist(p.currentPlaylistId, ids)
    clearSelection()
  }

  function moveSelectedTop() {
    if (!p.currentPlaylistId || p.currentPlaylistId === '__all__') return
    const ids = Array.from(selectedIds)
    p.moveSelected(p.currentPlaylistId, ids, 0)
  }

  function moveSelectedBottom() {
    if (!p.currentPlaylistId || p.currentPlaylistId === '__all__') return
    const ids = Array.from(selectedIds)
    const len = p.playlists[p.currentPlaylistId]?.trackIds.length || 0
    p.moveSelected(p.currentPlaylistId, ids, len)
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLDivElement>) {
    if (e.key === 'Delete') { removeSelectedFromCurrent() }
    if (e.altKey && e.key === 'ArrowUp') { moveSelectedTop() }
    if (e.altKey && e.key === 'ArrowDown') { moveSelectedBottom() }
  }

  function fmtDuration(d?: number) {
    const x = Math.max(0, Math.floor(d || 0))
    const m = Math.floor(x / 60)
    const s = x % 60
    return `${m}:${String(s).padStart(2, '0')}`
  }

  return (
    <div className="app">
      <div className="topbar">
        <div className="tabs">
          <button className={tab==='playlist' ? 'tab active' : 'tab'} onClick={() => setTab('playlist')}>歌单管理</button>
          <button className={tab==='settings' ? 'tab active' : 'tab'} onClick={() => setTab('settings')}>设置</button>
          <button className={tab==='player' ? 'tab active' : 'tab'} onClick={() => setTab('player')}>播放器</button>
        </div>
        {tab==='playlist' && (
          <div className="row" style={{ marginLeft: 'auto', gap: 8 }}>
            {!editing && <button className="btn" onClick={beginEdit}>编辑</button>}
            {editing && <>
              <button className="btn" onClick={saveEdit}>保存</button>
              <button className="btn" onClick={cancelEdit}>取消</button>
            </>}
          </div>
        )}
      </div>
      <div className={tab==='playlist' ? 'layout layout-3 view' : 'layout layout-1 view'}>
        {tab==='playlist' && (
          <>
            <PlaylistPanel editing={editing} />
            <div className="panel">
              <div className="list">
                <div className="row searchbar">
                  <input placeholder="搜索" style={{ flex: 1 }} value={query} onChange={e => setQuery(e.target.value)} />
                </div>
                {editing && (
                <div className="row" style={{ gap: 8, padding: '6px 12px' }} onKeyDown={onKeyDown} tabIndex={0}>
                  <select value={sortKey} onChange={e => setSortKey(e.target.value as any)}>
                    <option value="title">歌曲</option>
                    <option value="artist">艺术家</option>
                    <option value="album">专辑</option>
                    <option value="trackNo">曲序号</option>
                    <option value="duration">时长</option>
                  </select>
                  <select value={sortDirection} onChange={e => setSortDirection(e.target.value as any)}>
                    <option value="asc">升序</option>
                    <option value="desc">降序</option>
                  </select>
                  <select value={sortMode} onChange={e => setSortMode(e.target.value as any)}>
                    <option value="view">仅视图</option>
                    <option value="materialize">应用到歌单</option>
                  </select>
                  <button className="btn" onClick={applySort} disabled={!p.currentPlaylistId || p.currentPlaylistId==='__all__'}>排序</button>
                  <span style={{ flex: 1 }} />
                  <select value={targetPlaylistId} onChange={e => setTargetPlaylistId(e.target.value)}>
                    <option value="">选择目标歌单</option>
                    {p.order.map(id => (<option key={id} value={id}>{p.playlists[id].name}</option>))}
                  </select>
                  <select value={addMode} onChange={e => setAddMode(e.target.value as any)}>
                    <option value="append">追加</option>
                    <option value="replace">替换</option>
                  </select>
                  <button className="btn" onClick={addSelectedToTarget} disabled={!selectedIds.size || !targetPlaylistId}>添加到歌单</button>
                  <button className="btn" onClick={() => { if (p.currentPlaylistId) p.dedupePlaylist(p.currentPlaylistId) }} disabled={!p.currentPlaylistId || p.currentPlaylistId==='__all__'}>去重</button>
                  <button className="btn" onClick={removeSelectedFromCurrent} disabled={!selectedIds.size || !p.currentPlaylistId || p.currentPlaylistId==='__all__'}>从当前歌单移除</button>
                  <button className="btn" onClick={moveSelectedTop} disabled={!selectedIds.size || !p.currentPlaylistId || p.currentPlaylistId==='__all__'}>置顶</button>
                  <button className="btn" onClick={moveSelectedBottom} disabled={!selectedIds.size || !p.currentPlaylistId || p.currentPlaylistId==='__all__'}>置底</button>
                </div>
                )}
                <table>
                  <thead>
                  <tr>
                    <th style={{ width: 28, display: editing ? '' : 'none' }}>
                      <input type="checkbox" onChange={toggleSelectAll} checked={selectedIds.size === sorted.length && sorted.length > 0} />
                    </th>
                    <th style={{ width: 32 }}>#</th>
                    <th>歌曲</th>
                    <th>艺术家</th>
                    <th>专辑</th>
                    <th style={{ width: 80 }}>时长</th>
                  </tr>
                  </thead>
                </table>
                <VList height={window.innerHeight - 200} itemCount={displayed.length} itemSize={40} width={'100%'}>
                  {({ index, style }: any) => {
                    const t = displayed[index]
                    return (
                      <div style={style} key={t.id}>
                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                          <tbody>
                          <tr className="drag" draggable={editing}
                              onDragStart={e => onDragStart(e, index)} onDragOver={e => onDragOver(e, index)} onDrop={e => onDrop(e, index)} onDragEnd={onDragEnd}
                              onDoubleClick={() => onRowDoubleClick(t.id)} onClick={editing ? (e => onRowClick(e, index, t.id)) : undefined}
                              style={{ background: selectedIds.has(t.id) ? 'var(--bg-hover)' : undefined }}>
                            <td style={{ width: 28, padding: '8px 12px', borderBottom: '1px solid var(--border)', display: editing ? '' : 'none' }}>
                              <input type="checkbox" checked={selectedIds.has(t.id)} onChange={e => toggleCheckbox(e, index, t.id)} />
                            </td>
                            <td style={{ width: 32, padding: '8px 12px', borderBottom: '1px solid var(--border)' }}>{index + 1}</td>
                            <td style={{ padding: '8px 12px', borderBottom: '1px solid var(--border)' }}>{(t as any).title || (t as any).filename}</td>
                            <td className="muted" style={{ padding: '8px 12px', borderBottom: '1px solid var(--border)' }}>{t.artist}</td>
                            <td className="muted" style={{ padding: '8px 12px', borderBottom: '1px solid var(--border)' }}>{t.album}</td>
                            <td className="muted" style={{ width: 80, padding: '8px 12px', borderBottom: '1px solid var(--border)' }}>{fmtDuration(t.duration)}</td>
                          </tr>
                          </tbody>
                        </table>
                      </div>
                    )
                  }}
                </VList>
              </div>
            </div>
            <NowPlaying editable={editing} />
          </>
        )}
        {tab==='settings' && (
          <SettingsPanel />
        )}
        {tab==='player' && (
          <div className="panel">
            <NowPlaying editable={false} />
          </div>
        )}
      </div>
      <PlayerBar playingEnabled={!editing} />
    </div>
  )
}
