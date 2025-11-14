import { useEffect, useState } from 'react'
import SourcePanel from './SourcePanel'
import { useSettings } from '../stores/settings'
//

export default function SettingsPanel() {
  const settings = useSettings()
  const [showResetConfirm, setShowResetConfirm] = useState(false)

  useEffect(() => {
    const t = settings.preferences.theme || 'dark'
    document.documentElement.classList.toggle('light', t === 'light')
  }, [settings.preferences.theme])

  function exportBackup() {
    const keys = ['library', 'playlists', 'player', 'settings']
    const data: any = { timestamp: Date.now() }
    for (const k of keys) {
      const v = localStorage.getItem(k)
      if (v) data[k] = JSON.parse(v)
    }
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'nmp-backup.json'
    a.click()
  }

  async function importBackup() {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = 'application/json'
    input.onchange = async () => {
      const file = input.files?.[0]
      if (!file) return
      const text = await file.text()
      const obj = JSON.parse(text)
      if (obj.library) localStorage.setItem('library', JSON.stringify(obj.library))
      if (obj.playlists) localStorage.setItem('playlists', JSON.stringify(obj.playlists))
      if (obj.player) localStorage.setItem('player', JSON.stringify(obj.player))
      if (obj.settings) localStorage.setItem('settings', JSON.stringify(obj.settings))
      location.reload()
    }
    input.click()
  }

  async function toggleNotifications() {
    const enabled = !settings.preferences.notifications
    if (enabled && 'Notification' in window && Notification.permission !== 'granted') {
      try { await Notification.requestPermission() } catch {}
    }
    settings.updatePreferences({ notifications: enabled })
  }

  async function doReset() {
    try { indexedDB.deleteDatabase('music-player-db') } catch {}
    try { localStorage.clear() } catch {}
    location.reload()
  }

  return (
    <div className="panel" style={{ padding: 12 }}>
      <div className="col" style={{ gap: 16 }}>
        <div className="col" style={{ gap: 8 }}>
          <span className="muted">播放偏好</span>
          <div className="row" style={{ gap: 8 }}>
            <select value={settings.preferences.theme || 'dark'} onChange={e => settings.updatePreferences({ theme: e.target.value as any })}>
              <option value="dark">暗黑</option>
              <option value="light">明亮</option>
            </select>
            <select value={settings.preferences.quality || 'auto'} onChange={e => settings.updatePreferences({ quality: e.target.value as any })}>
              <option value="auto">自动</option>
              <option value="high">高音质</option>
              <option value="medium">中等</option>
              <option value="low">低音质</option>
            </select>
          </div>
        </div>
        <div className="row" style={{ gap: 8 }}>
          <span className="muted">系统通知</span>
          <button className="btn" onClick={toggleNotifications}>{settings.preferences.notifications ? '关闭通知' : '开启通知'}</button>
        </div>
        <div className="row" style={{ gap: 8 }}>
          <button className="btn" onClick={exportBackup}>导出备份</button>
          <button className="btn" onClick={importBackup}>导入备份</button>
          <button className="btn" onClick={() => setShowResetConfirm(true)} style={{ marginLeft: 8 }}>重置站点</button>
        </div>
        <div className="col" style={{ gap: 8 }}>
          <span className="muted">账户与存储源设置</span>
          <SourcePanel />
        </div>
      </div>
      {showResetConfirm && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 8, padding: 16, minWidth: 280 }}>
            <div className="col" style={{ gap: 12 }}>
              <span>确认重置站点并清除所有数据吗？此操作不可撤销。</span>
              <div className="row" style={{ gap: 8, justifyContent: 'flex-end' }}>
                <button className="btn" onClick={() => setShowResetConfirm(false)}>取消</button>
                <button className="btn" onClick={doReset}>确认重置</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
