import { useEffect, useMemo, useState } from 'react'
import { FixedSizeList as VList } from 'react-window'
import { useLibrary } from '../stores/library'
import { usePlaylists } from '../stores/playlists'
import { usePlayer } from '../stores/player'
import { getBlob } from '../services/cache/indexeddb'

export default function LibraryView() {
  const lib = useLibrary()
  const p = usePlaylists()
  const player = usePlayer()
  const [query, setQuery] = useState('')
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [lastIndex, setLastIndex] = useState<number | null>(null)
  const [targetPlaylistId, setTargetPlaylistId] = useState<string | ''>('')
  const [addMode, setAddMode] = useState<'append'|'replace'>('append')

  const rows = useMemo(() => lib.order.map(id => lib.tracks[id]), [lib.tracks, lib.order])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return rows
    return rows.filter(t => (t.title || '').toLowerCase().includes(q) || (t.artist || '').toLowerCase().includes(q) || (t.album || '').toLowerCase().includes(q))
  }, [rows, query])

  const displayed = useMemo(() => {
    const norm = (t: any) => {
      const name = (t.title || t.filename || '').trim()
      const base = name.replace(/\.[^.]+$/, '')
      return base.toLowerCase()
    }
    const seen = new Set<string>()
    const res: any[] = []
    for (const t of filtered) {
      const key = (t as any).uid || norm(t)
      if (seen.has(String(key))) continue
      seen.add(String(key))
      res.push(t)
    }
    return res
  }, [filtered])

  useEffect(() => {
    player.setQueue(displayed.map((r: any) => r.uid || r.id))
  }, [displayed.length])

  function fmtDuration(d?: number) {
    const x = Math.max(0, Math.floor(d || 0))
    const m = Math.floor(x / 60)
    const s = x % 60
    return `${m}:${String(s).padStart(2, '0')}`
  }

  function onRowClick(e: React.MouseEvent<HTMLTableRowElement>, index: number, id: string) {
    const s = new Set(selectedIds)
    if ((e as any).shiftKey && lastIndex !== null) {
      const [start, end] = [Math.min(lastIndex, index), Math.max(lastIndex, index)]
      for (let i = start; i <= end; i++) s.add(displayed[i].id)
    } else if ((e.ctrlKey || (e as any).metaKey)) {
      if (s.has(id)) s.delete(id); else s.add(id)
      setLastIndex(index)
    } else {
      s.clear(); s.add(id); setLastIndex(index)
    }
    setSelectedIds(s)
  }

  function toggleSelectAll() {
    if (selectedIds.size === displayed.length && displayed.length > 0) { setSelectedIds(new Set()) }
    else { setSelectedIds(new Set(displayed.map(x => x.id))) }
  }

  function toggleCheckbox(e: any, index: number, id: string) {
    if (e && e.stopPropagation) e.stopPropagation()
    const s = new Set(selectedIds)
    const shift = !!(e?.nativeEvent?.shiftKey)
    if (shift && lastIndex !== null) {
      const [start, end] = [Math.min(lastIndex, index), Math.max(lastIndex, index)]
      for (let i = start; i <= end; i++) s.add(displayed[i].id)
    } else {
      if (s.has(id)) s.delete(id); else s.add(id)
      setLastIndex(index)
    }
    setSelectedIds(s)
  }

  async function onRowDoubleClick(id: string) {
    const blob = await getBlob('audioBlobs', id)
    await player.loadTrack(id, blob || undefined)
  }

  function addSelectedToTarget() {
    if (!targetPlaylistId) return
    const ids = Array.from(selectedIds)
    p.addManyToPlaylist(targetPlaylistId, ids, addMode)
  }

  return (
    <div className="panel">
      <div className="list" style={{ ['--col-check' as any]: '28px' }}>
        <div className="row searchbar">
          <input placeholder="搜索" style={{ flex: 1 }} value={query} onChange={e => setQuery(e.target.value)} />
        </div>
        <div className="row" style={{ gap: 8, padding: '6px 12px' }}>
          <select value={targetPlaylistId} onChange={e => setTargetPlaylistId(e.target.value)}>
            <option value="">选择目标歌单</option>
            {p.order.map(id => (<option key={id} value={id}>{p.playlists[id].name}</option>))}
          </select>
          <select value={addMode} onChange={e => setAddMode(e.target.value as any)}>
            <option value="append">追加</option>
            <option value="replace">替换</option>
          </select>
          <button className="btn" onClick={addSelectedToTarget} disabled={!selectedIds.size || !targetPlaylistId}>添加到歌单</button>
        </div>
        <table>
          <colgroup>
            <col style={{ width: 'var(--col-check)' }} />
            <col style={{ width: 40 }} />
            <col />
            <col style={{ width: '24%' }} />
            <col style={{ width: '24%' }} />
            <col style={{ width: 80 }} />
          </colgroup>
          <thead>
            <tr>
              <th><input type="checkbox" onChange={toggleSelectAll} checked={selectedIds.size === displayed.length && displayed.length > 0} /></th>
              <th>#</th>
              <th>歌曲</th>
              <th>艺术家</th>
              <th>专辑</th>
              <th>时长</th>
            </tr>
          </thead>
        </table>
        <VList height={window.innerHeight - 200} itemCount={displayed.length} itemSize={40} width={'100%'}>
          {({ index, style }: any) => {
            const t = displayed[index]
            return (
              <div style={style} key={t.id}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <colgroup>
                    <col style={{ width: 'var(--col-check)' }} />
                    <col style={{ width: 40 }} />
                    <col />
                    <col style={{ width: '24%' }} />
                    <col style={{ width: '24%' }} />
                    <col style={{ width: 80 }} />
                  </colgroup>
                  <tbody>
                    <tr onDoubleClick={() => onRowDoubleClick(t.id)} onClick={e => onRowClick(e, index, t.id)} style={{ background: selectedIds.has(t.id) ? 'var(--bg-hover)' : undefined }}>
                      <td style={{ padding: '8px 12px', borderBottom: '1px solid var(--border)' }}>
                        <input type="checkbox" checked={selectedIds.has(t.id)} onChange={e => toggleCheckbox(e, index, t.id)} />
                      </td>
                      <td style={{ padding: '8px 12px', borderBottom: '1px solid var(--border)' }}>{index + 1}</td>
                      <td style={{ padding: '8px 12px', borderBottom: '1px solid var(--border)' }}>{(t as any).title || (t as any).filename}</td>
                      <td className="muted" style={{ padding: '8px 12px', borderBottom: '1px solid var(--border)' }}>{t.artist}</td>
                      <td className="muted" style={{ padding: '8px 12px', borderBottom: '1px solid var(--border)' }}>{t.album}</td>
                      <td className="muted" style={{ padding: '8px 12px', borderBottom: '1px solid var(--border)' }}>{fmtDuration(t.duration)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            )
          }}
        </VList>
      </div>
    </div>
  )
}