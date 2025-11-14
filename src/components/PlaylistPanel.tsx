import { useState } from 'react'
import { usePlaylists } from '../stores/playlists'

export default function PlaylistPanel() {
  const p = usePlaylists()
  const [name, setName] = useState('新建歌单')

  function exportJson() {
    const data = p.order.map(id => p.playlists[id])
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'playlists.json'
    a.click()
  }

  async function importJson() {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = 'application/json'
    input.onchange = async () => {
      const file = input.files?.[0]
      if (!file) return
      const text = await file.text()
      const data = JSON.parse(text)
      p.importPlaylistsWithValidation(data)
    }
    input.click()
  }

  return (
    <div className="panel left" style={{ padding: 12 }}>
      <div className="row" style={{ gap: 8 }}>
        <input value={name} onChange={e => setName(e.target.value)} />
        <button className="btn" onClick={() => p.createPlaylist(name)}>创建</button>
      </div>
      <div className="row" style={{ gap: 8, marginTop: 8 }}>
        <button className="btn" onClick={importJson}>导入</button>
        <button className="btn" onClick={exportJson}>导出</button>
      </div>
      <div style={{ marginTop: 12 }}>
        <div className="row" style={{ justifyContent: 'space-between', padding: '6px 0' }}>
          <button className="btn" onClick={() => p.setCurrent('__all__')}>全部歌曲</button>
        </div>
        {p.order.map(id => (
          <div key={id} className="row" style={{ justifyContent: 'space-between', padding: '6px 0' }}>
            <button className="btn" onClick={() => p.setCurrent(id)}>{p.playlists[id].name}</button>
            <div className="row" style={{ gap: 6 }}>
              <button className="btn" onClick={() => {
                const n = prompt('重命名', p.playlists[id].name)
                if (n) p.renamePlaylist(id, n)
              }}>重命名</button>
              <button className="btn" onClick={() => p.deletePlaylist(id)}>删除</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
