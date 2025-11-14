import { useEffect, useMemo, useState } from 'react'
import { FixedSizeList as VList } from 'react-window'
import { useLibrary } from '../stores/library'
import { usePlayer } from '../stores/player'
import { getBlob } from '../services/cache/indexeddb'

export default function LibraryView() {
  const lib = useLibrary()
  const player = usePlayer()
  const [query, setQuery] = useState('')
  

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


  async function onRowDoubleClick(id: string) {
    const blob = await getBlob('audioBlobs', id)
    await player.loadTrack(id, blob || undefined)
  }

  return (
    <div className="panel">
      <div className="list">
        <div className="row searchbar">
          <input placeholder="搜索" style={{ flex: 1 }} value={query} onChange={e => setQuery(e.target.value)} />
        </div>
        <table>
          <colgroup>
            <col style={{ width: 40 }} />
            <col />
            <col style={{ width: '24%' }} />
            <col style={{ width: '24%' }} />
            <col style={{ width: 80 }} />
          </colgroup>
          <thead>
            <tr>
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
                    <col style={{ width: 40 }} />
                    <col />
                    <col style={{ width: '24%' }} />
                    <col style={{ width: '24%' }} />
                    <col style={{ width: 80 }} />
                  </colgroup>
                  <tbody>
                    <tr onDoubleClick={() => onRowDoubleClick(t.id)}>
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