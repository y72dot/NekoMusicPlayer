import { useState } from 'react'
import { createLocalFSProvider, scanLocalFSTracks } from '../providers/localfs'
import { createDropboxProvider } from '../providers/dropbox'
import { createOSSProvider } from '../providers/oss'
import { createCOSProvider } from '../providers/cos'
import { useLibrary } from '../stores/library'
import { usePlayer } from '../stores/player'
import { putBlob, getBlob } from '../services/cache/indexeddb'
import { useSettings } from '../stores/settings'
import { registerProvider } from '../providers/registry'

export default function SourcePanel() {
  const [scanning, setScanning] = useState(false)
  const [testing, setTesting] = useState<null | 'dropbox' | 'oss' | 'cos'>(null)
  const [tab, setTab] = useState<'local'|'dropbox'|'oss'|'cos'>('local')
  const [local] = useState(() => createLocalFSProvider())
  const [dbx] = useState(() => createDropboxProvider())
  const [oss] = useState(() => createOSSProvider())
  const [cos] = useState(() => createCOSProvider())
  const [dbxMsg, setDbxMsg] = useState('')
  const [ossMsg, setOssMsg] = useState('')
  const [cosMsg, setCosMsg] = useState('')
  const library = useLibrary()
  const player = usePlayer()
  const settings = useSettings()

  async function importLocal() {
    setScanning(true)
    try {
      await local.connect()
      ;(window as any).__localfs = local
      const items = await scanLocalFSTracks(local)
      library.upsertTracks(items.map(i => i.track))
      for (const { track, blob } of items) {
        await putBlob('audioBlobs', track.id, blob)
      }
      if (!player.currentTrackId && items.length) {
        player.setQueue(items.map(i => i.track.id))
        await player.loadTrack(items[0].track.id, items[0].blob)
      }
    } finally {
      setScanning(false)
    }
  }

  async function importDropbox() {
    setScanning(true)
    try {
      await dbx.connect()
      registerProvider(dbx)
      const root = settings.dropbox.rootPath || ''
      const files = await dbx.listAudioFilesRecursively(root)
      const items = await Promise.all(files.map(async p => ({
        id: `${dbx.id}:${p}`,
        path: p
      })))
      const tracks = items.map(it => ({
        id: `${dbx.id}:${it.path}`,
        title: it.path.split('/').pop() || 'audio',
        artist: '',
        album: '',
        format: 'unknown',
        sourceType: 'custom',
        sourceRef: { providerId: dbx.id, pathOrKey: it.path }
      })) as any
      library.upsertTracks(tracks)
      if (!player.currentTrackId && tracks.length) {
        player.setQueue(tracks.map((t: any) => t.id))
      }
    } finally { setScanning(false) }
  }

  async function testDropbox() {
    setTesting('dropbox')
    setDbxMsg('')
    try {
      await dbx.connect()
      const root = settings.dropbox.rootPath || ''
      const files = await dbx.listAudioFilesRecursively(root)
      setDbxMsg(files.length ? '连接成功，可扫描并导入' : '连接成功，未发现音频文件')
    } catch (e: any) {
      setDbxMsg('连接失败，请检查凭据与根路径')
    } finally {
      setTesting(null)
    }
  }

  async function importOSS() {
    setScanning(true)
    try {
      await oss.connect()
      registerProvider(oss)
      const files = await oss.listAudioFilesRecursively('/')
      const tracks = files.map(p => ({
        id: `${oss.id}:${p}`,
        title: p.split('/').pop() || 'audio',
        artist: '',
        album: '',
        format: 'unknown',
        sourceType: 'custom',
        sourceRef: { providerId: oss.id, pathOrKey: p }
      })) as any
      library.upsertTracks(tracks)
      if (!player.currentTrackId && tracks.length) player.setQueue(tracks.map((t: any) => t.id))
    } finally { setScanning(false) }
  }

  async function testOSS() {
    setTesting('oss')
    setOssMsg('')
    try {
      await oss.connect()
      const files = await oss.listAudioFilesRecursively('/')
      setOssMsg(files.length ? '连接成功，可扫描并导入' : '连接成功，未发现音频文件')
    } catch (e: any) {
      setOssMsg('连接失败，请检查凭据与配置')
    } finally {
      setTesting(null)
    }
  }

  async function importCOS() {
    setScanning(true)
    try {
      await cos.connect()
      registerProvider(cos)
      const files = await cos.listAudioFilesRecursively('/')
      const tracks = files.map(p => ({
        id: `${cos.id}:${p}`,
        title: p.split('/').pop() || 'audio',
        artist: '',
        album: '',
        format: 'unknown',
        sourceType: 'custom',
        sourceRef: { providerId: cos.id, pathOrKey: p }
      })) as any
      library.upsertTracks(tracks)
      if (!player.currentTrackId && tracks.length) player.setQueue(tracks.map((t: any) => t.id))
    } finally { setScanning(false) }
  }

  async function testCOS() {
    setTesting('cos')
    setCosMsg('')
    try {
      await cos.connect()
      const files = await cos.listAudioFilesRecursively('/')
      setCosMsg(files.length ? '连接成功，可扫描并导入' : '连接成功，未发现音频文件')
    } catch (e: any) {
      setCosMsg('连接失败，请检查凭据与配置')
    } finally {
      setTesting(null)
    }
  }

  const ossReady = !!settings.oss.region && !!settings.oss.bucket && !!settings.oss.accessKeyId && !!settings.oss.accessKeySecret
  const cosReady = !!settings.cos.region && !!settings.cos.bucket && !!settings.cos.tmpSecretId && !!settings.cos.tmpSecretKey && !!settings.cos.sessionToken

  return (
    <div className="panel left" style={{ padding: 12 }}>
      <div className="row" style={{ gap: 8, marginBottom: 8 }}>
        <button className="btn" onClick={() => setTab('local')}>本地</button>
        <button className="btn" onClick={() => setTab('dropbox')}>Dropbox</button>
        <button className="btn" onClick={() => setTab('oss')}>OSS</button>
        <button className="btn" onClick={() => setTab('cos')}>COS</button>
      </div>
      {tab === 'local' && (
        <div className="col">
          <div className="muted">选择包含音频文件的文件夹，系统将自动扫描并导入。</div>
          <button className="btn" onClick={importLocal} disabled={scanning}>{scanning ? '扫描中…' : '导入本地文件夹'}</button>
        </div>
      )}
      {tab === 'dropbox' && (
        <div className="col" style={{ gap: 8 }}>
          <label className="col">
            <span className="muted">App Key</span>
            <input value={settings.dropbox.appKey} onChange={e => settings.updateDropbox({ appKey: e.target.value })} />
          </label>
          <label className="col">
            <span className="muted">Access Token</span>
            <input value={settings.dropbox.accessToken || ''} onChange={e => settings.updateDropbox({ accessToken: e.target.value })} />
          </label>
          <label className="col">
            <span className="muted">根路径</span>
            <input value={settings.dropbox.rootPath || ''} onChange={e => settings.updateDropbox({ rootPath: e.target.value })} />
          </label>
          <div className="muted">填写令牌与根路径后，先测试连接，再扫描并导入。</div>
          <div className="row" style={{ gap: 8 }}>
            <button className="btn" onClick={testDropbox} disabled={testing=== 'dropbox' || !settings.dropbox.accessToken}>{testing=== 'dropbox' ? '测试中…' : '测试连接'}</button>
            <button className="btn" onClick={importDropbox} disabled={scanning || !settings.dropbox.accessToken}>{scanning ? '扫描中…' : '扫描并导入'}</button>
          </div>
          {!!dbxMsg && <div className="muted">{dbxMsg}</div>}
        </div>
      )}
      {tab === 'oss' && (
        <div className="col" style={{ gap: 8 }}>
          <input placeholder="region" value={settings.oss.region || ''} onChange={e => settings.updateOSS({ region: e.target.value })} />
          <input placeholder="bucket" value={settings.oss.bucket || ''} onChange={e => settings.updateOSS({ bucket: e.target.value })} />
          <input placeholder="endpoint(可选)" value={settings.oss.endpoint || ''} onChange={e => settings.updateOSS({ endpoint: e.target.value })} />
          <input placeholder="prefix(可选)" value={settings.oss.prefix || ''} onChange={e => settings.updateOSS({ prefix: e.target.value })} />
          <input placeholder="accessKeyId" value={settings.oss.accessKeyId || ''} onChange={e => settings.updateOSS({ accessKeyId: e.target.value })} />
          <input placeholder="accessKeySecret" value={settings.oss.accessKeySecret || ''} onChange={e => settings.updateOSS({ accessKeySecret: e.target.value })} />
          <input placeholder="stsToken" value={settings.oss.stsToken || ''} onChange={e => settings.updateOSS({ stsToken: e.target.value })} />
          <div className="muted">填写必要凭据后测试连接，成功后再扫描并导入。</div>
          <div className="row" style={{ gap: 8 }}>
            <button className="btn" onClick={testOSS} disabled={testing=== 'oss' || !ossReady}>{testing=== 'oss' ? '测试中…' : '测试连接'}</button>
            <button className="btn" onClick={importOSS} disabled={scanning || !ossReady}>{scanning ? '扫描中…' : '扫描并导入'}</button>
          </div>
          {!!ossMsg && <div className="muted">{ossMsg}</div>}
        </div>
      )}
      {tab === 'cos' && (
        <div className="col" style={{ gap: 8 }}>
          <input placeholder="region" value={settings.cos.region || ''} onChange={e => settings.updateCOS({ region: e.target.value })} />
          <input placeholder="bucket(不含 appid)" value={settings.cos.bucket || ''} onChange={e => settings.updateCOS({ bucket: e.target.value })} />
          <input placeholder="appId(可选)" value={settings.cos.appId || ''} onChange={e => settings.updateCOS({ appId: e.target.value })} />
          <input placeholder="prefix(可选)" value={settings.cos.prefix || ''} onChange={e => settings.updateCOS({ prefix: e.target.value })} />
          <input placeholder="tmpSecretId" value={settings.cos.tmpSecretId || ''} onChange={e => settings.updateCOS({ tmpSecretId: e.target.value })} />
          <input placeholder="tmpSecretKey" value={settings.cos.tmpSecretKey || ''} onChange={e => settings.updateCOS({ tmpSecretKey: e.target.value })} />
          <input placeholder="sessionToken" value={settings.cos.sessionToken || ''} onChange={e => settings.updateCOS({ sessionToken: e.target.value })} />
          <div className="muted">填写临时凭据后测试连接，成功后再扫描并导入。</div>
          <div className="row" style={{ gap: 8 }}>
            <button className="btn" onClick={testCOS} disabled={testing=== 'cos' || !cosReady}>{testing=== 'cos' ? '测试中…' : '测试连接'}</button>
            <button className="btn" onClick={importCOS} disabled={scanning || !cosReady}>{scanning ? '扫描中…' : '扫描并导入'}</button>
          </div>
          {!!cosMsg && <div className="muted">{cosMsg}</div>}
        </div>
      )}
    </div>
  )
}
