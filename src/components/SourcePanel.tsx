import { useState } from 'react'
import { createLocalFSProvider, scanLocalFSTracks } from '../providers/localfs'
import { createFileInputProvider } from '../providers/fileinput'
import { createDropboxProvider } from '../providers/dropbox'
import { createOSSProvider } from '../providers/oss'
import { createCOSProvider } from '../providers/cos'
import { useLibrary } from '../stores/library'
import { usePlayer } from '../stores/player'
import { putBlob, getBlob, getJSON, putJSON } from '../services/cache/indexeddb'
import { useSettings } from '../stores/settings'
import { registerProvider } from '../providers/registry'
import { extToFormat } from '../services/metadata/metadata'
import { computeUid } from '../utils/uid'
import { setRootHandle, ensureNmpData, flushAll, scheduleFlush, isFsSupported, readJson, loadRootHandleFromIDB, setSnapshotTarget, getRootHandlesMap, getRootNamesMap, setRootNamesMap } from '../services/storage/fs'
import { usePlaylists } from '../stores/playlists'

export default function SourcePanel() {
  const [scanning, setScanning] = useState(false)
  const [testing, setTesting] = useState<null | 'dropbox' | 'oss' | 'cos'>(null)
  const [tab, setTab] = useState<'local'|'dropbox'|'oss'|'cos'>('local')
  const [local] = useState(() => createLocalFSProvider())
  const [roots, setRoots] = useState<Record<string, FileSystemDirectoryHandle>>({})
  const [rootNames, setRootNames] = useState<Record<string, string>>({})
  const [snapshotTargetId, setSnapshotTargetId] = useState<string | null>(null)
  const [fileMsg, setFileMsg] = useState('')
  const [snapMsg, setSnapMsg] = useState('')
  const [rootSelected, setRootSelected] = useState(false)
  const [libCount, setLibCount] = useState(0)
  const [plsCount, setPlsCount] = useState(0)
  const [dbx] = useState(() => createDropboxProvider())
  const [oss] = useState(() => createOSSProvider())
  const [cos] = useState(() => createCOSProvider())
  const [dbxMsg, setDbxMsg] = useState('')
  const [ossMsg, setOssMsg] = useState('')
  const [cosMsg, setCosMsg] = useState('')
  const library = useLibrary()
  const player = usePlayer()
  const settings = useSettings()
  const playlists = usePlaylists()
  function startResize(e: React.MouseEvent<HTMLDivElement>) {
    e.preventDefault()
    const startX = e.clientX
    const startW = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--left-width')) || 260
    function onMove(ev: MouseEvent) {
      const dx = ev.clientX - startX
      const w = Math.min(420, Math.max(180, startW + dx))
      document.documentElement.style.setProperty('--left-width', `${w}px`)
    }
    function onUp() {
      const w = getComputedStyle(document.documentElement).getPropertyValue('--left-width').trim()
      try { localStorage.setItem('layout.leftWidth', w) } catch {}
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }

  // 初始化状态信息
  useState(() => {
    (async () => {
      try {
        const flag = localStorage.getItem('nmp.fsRootSelected') === 'true'
        const h = await loadRootHandleFromIDB()
        setRootSelected(!!flag && !!h)
        const savedRoots = await getJSON<Record<string, FileSystemDirectoryHandle>>('fs.rootHandles')
        let nextRoots = savedRoots || {}
        if ((!nextRoots || Object.keys(nextRoots).length === 0) && h) {
          const rid = 'root-1'
          nextRoots = { [rid]: h }
          await putJSON('fs.rootHandles', nextRoots)
        }
        setRoots(nextRoots)
        try {
          const names = await getRootNamesMap()
          const n = { ...names }
          for (const rid of Object.keys(nextRoots)) {
            if (!n[rid]) n[rid] = (nextRoots[rid] as any)?.name || rid
          }
          await setRootNamesMap(n)
          setRootNames(n)
        } catch {}
        try {
          const target = await getJSON<string>('fs.snapshotTarget')
          if (!target && Object.keys(nextRoots).length) {
            const first = Object.keys(nextRoots)[0]
            await setSnapshotTarget(first)
            setSnapshotTargetId(first)
          } else {
            setSnapshotTargetId(target || null)
          }
        } catch {}
        const libSnap = await readJson<any>('library.json')
        const plsSnap = await readJson<any>('playlists.json')
        if (!libSnap || !plsSnap) setSnapMsg('未找到快照，将在导入后生成。')
        setLibCount(Object.keys(library.tracks).length)
        setPlsCount(playlists.order.length)
      } catch {}
    })()
    return null
  })

  // 订阅库与歌单变化
  useState(() => {
    const unsub1 = useLibrary.subscribe(s => s.tracks, () => setLibCount(Object.keys(useLibrary.getState().tracks).length))
    const unsub2 = usePlaylists.subscribe(s => s.order, () => setPlsCount(usePlaylists.getState().order.length))
    return () => { try { (unsub1 as any)() } catch {}; try { (unsub2 as any)() } catch {} }
  })

  async function importLocal() {
    setScanning(true)
    try {
      const savedRoots = await getJSON<Record<string, FileSystemDirectoryHandle>>('fs.rootHandles')
      const rootsMap = savedRoots || {}
      setRoots(rootsMap)
      if (Object.keys(rootsMap).length === 0) {
        await local.connect()
        ;(window as any).__localfs = local
        try {
          const h = (local as any).getRootHandle()
          if (h) {
            await setRootHandle(h)
            await ensureNmpData()
            const rid = 'root-1'
            await putJSON('fs.rootHandles', { [rid]: h })
            setRoots({ [rid]: h })
            await setSnapshotTarget(rid)
            setSnapshotTargetId(rid)
          }
        } catch {}
      } else {
        const firstHandle = rootsMap[Object.keys(rootsMap)[0]]
        if (firstHandle) { await setRootHandle(firstHandle); await ensureNmpData() }
      }
      try {
        const libSnap = await readJson<any>('library.json')
        const plsSnap = await readJson<any>('playlists.json')
        if (!libSnap || !plsSnap) setSnapMsg('未找到已有 JSON，首次导入将生成快照。')
      } catch {}
      const queueIds: string[] = []
      const rootIds = Object.keys(rootsMap).length ? Object.keys(rootsMap) : ['root-1']
      for (const rid of rootIds) {
        const h = rootsMap[rid] || (local as any).getRootHandle()
        const provider = createLocalFSProvider(`localfs:${rid}`)
        registerProvider(provider)
        ;(provider as any).setRootHandle(h)
        ;(window as any)[`__localfs_${rid}`] = provider
        const files = await provider.listAudioFilesRecursively('/')
        const batch = 5
        for (let i = 0; i < files.length; i += batch) {
          const slice = files.slice(i, i + batch)
          const results = await Promise.all(slice.map(async p => {
            try {
              const blob = await provider.readFile(p)
              const name = p.split('/').pop() || 'audio'
              const track = await (await import('../services/metadata/metadata')).buildTrackFromBlob({ blob, name, providerId: provider.id, pathOrKey: p, sourceType: 'localfs' })
              const uid = await computeUid(blob)
              const t: any = { ...track, uid, sourceRef: { ...track.sourceRef, rootId: rid }, sources: [{ kind: 'fs', locator: p, providerId: provider.id, rootId: rid, primary: true }], filename: name, addedAt: Date.now() }
              return t
            } catch { return null }
          }))
          const valid = results.filter(Boolean) as any[]
          const libState = useLibrary.getState()
          const byUid = new Map<string, any>()
          for (const id of Object.keys(libState.tracks)) {
            const tt: any = libState.tracks[id]
            if (tt.uid) byUid.set(tt.uid, tt)
          }
          const toInsert: any[] = []
          for (const t of valid) {
            const ex = t.uid ? byUid.get(t.uid) : undefined
            if (ex) {
              const src = { kind: 'fs', locator: t.sourceRef.pathOrKey, providerId: t.sourceRef.providerId, rootId: t.sourceRef.rootId, primary: false }
              const srcs = Array.isArray(ex.sources) ? ex.sources : []
              const has = srcs.some((s: any) => s.providerId === src.providerId && s.locator === src.locator)
              if (!has) libState.upsertTracks([{ ...ex, sources: [...srcs, src] }])
            } else {
              toInsert.push(t)
            }
          }
          if (toInsert.length) {
            library.upsertTracks(toInsert)
            queueIds.push(...toInsert.map(t => t.id))
            scheduleFlush()
          }
          await new Promise(r => setTimeout(r, 0))
        }
      }
      try {
        const target = await getJSON<string>('fs.snapshotTarget')
        if (!target && rootIds.length) { await setSnapshotTarget(rootIds[0]); setSnapshotTargetId(rootIds[0]) }
      } catch {}
      if (!player.currentTrackId && queueIds.length) player.setQueue(queueIds)
    } finally {
      setScanning(false)
    }
  }

  async function refreshLocal() {
    setScanning(true)
    setFileMsg('')
    try {
      const h = (local as any).getRootHandle?.()
      if (!h) { setFileMsg('未绑定本地音乐文件夹'); return }
      const files = await local.listAudioFilesRecursively('/')
      const existing = new Set(Object.keys(library.tracks))
      const news: string[] = []
      for (const p of files) { const id = `${local.id}:${p}`; if (!existing.has(id)) news.push(p) }
      if (!news.length) { setFileMsg('没有发现新增文件'); return }
      const batch = 5
      let added = 0
      for (let i = 0; i < news.length; i += batch) {
        const slice = news.slice(i, i + batch)
        const results = await Promise.all(slice.map(async p => {
          try {
            const blob = await local.readFile(p)
            const name = p.split('/').pop() || 'audio'
            const track = await (await import('../services/metadata/metadata')).buildTrackFromBlob({ blob, name, providerId: local.id, pathOrKey: p, sourceType: 'localfs' })
            await putBlob('audioBlobs', track.id, blob)
            return track
          } catch { return null }
        }))
        const valid = results.filter(Boolean) as any[]
        if (valid.length) { library.upsertTracks(valid); scheduleFlush(); added += valid.length }
        await new Promise(r => setTimeout(r, 0))
      }
      setFileMsg(`已刷新，新增 ${added} 个文件`)
    } finally { setScanning(false) }
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
        format: extToFormat(it.path),
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
      {
        const libState = useLibrary.getState()
        const toInsert: any[] = []
        for (const p of files) {
          const title = p.split('/').pop() || 'audio'
          const base = title.replace(/\.[^.]+$/, '')
          const ex = Object.values(libState.tracks).find((t: any) => (t.title || t.filename || '').toLowerCase() === base.toLowerCase())
          if (ex) {
            const src = { kind: 'custom', locator: p, providerId: oss.id, primary: false }
            const srcs = Array.isArray(ex.sources) ? ex.sources : []
            const has = srcs.some((s: any) => s.providerId === src.providerId && s.locator === src.locator)
            if (!has) libState.upsertTracks([{ ...ex, sources: [...srcs, src] }])
          } else {
            toInsert.push({ id: `${oss.id}:${p}`, title: base, artist: '', album: '', format: extToFormat(p), sourceType: 'custom', sourceRef: { providerId: oss.id, pathOrKey: p } })
          }
        }
        if (toInsert.length) library.upsertTracks(toInsert)
        if (!player.currentTrackId && toInsert.length) player.setQueue(toInsert.map((t: any) => t.id))
      }
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
      {
        const libState = useLibrary.getState()
        const toInsert: any[] = []
        for (const p of files) {
          const title = p.split('/').pop() || 'audio'
          const base = title.replace(/\.[^.]+$/, '')
          const ex = Object.values(libState.tracks).find((t: any) => (t.title || t.filename || '').toLowerCase() === base.toLowerCase())
          if (ex) {
            const src = { kind: 'custom', locator: p, providerId: cos.id, primary: false }
            const srcs = Array.isArray(ex.sources) ? ex.sources : []
            const has = srcs.some((s: any) => s.providerId === src.providerId && s.locator === src.locator)
            if (!has) libState.upsertTracks([{ ...ex, sources: [...srcs, src] }])
          } else {
            toInsert.push({ id: `${cos.id}:${p}`, title: base, artist: '', album: '', format: extToFormat(p), sourceType: 'custom', sourceRef: { providerId: cos.id, pathOrKey: p } })
          }
        }
        if (toInsert.length) library.upsertTracks(toInsert)
        if (!player.currentTrackId && toInsert.length) player.setQueue(toInsert.map((t: any) => t.id))
      }
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
          <div className="row" style={{ gap: 8 }}>
            <button className="btn" onClick={async () => {
              const h = await (window as any).showDirectoryPicker()
              const base = String((h as any).name || 'root').trim().toLowerCase().replace(/[^a-z0-9\-_. ]+/g, '').replace(/\s+/g, '-')
              const saved = (await getJSON<Record<string, FileSystemDirectoryHandle>>('fs.rootHandles')) || {}
              const names = (await getRootNamesMap()) || {}
              let rid = `root-${base || 'folder'}`
              let idx = 2
              while (saved[rid]) { rid = `root-${base || 'folder'}-${idx++}` }
              const next = { ...saved, [rid]: h }
              await putJSON('fs.rootHandles', next)
              setRoots(next)
              const nextNames = { ...names, [rid]: (h as any).name || rid }
              await setRootNamesMap(nextNames)
              setRootNames(nextNames)
            }} disabled={scanning || !isFsSupported()}>添加本地音乐文件夹</button>
            <button className="btn" onClick={importLocal} disabled={scanning || !isFsSupported()}>{scanning ? '扫描中…' : '扫描所有已授权目录'}</button>
            <button className="btn" onClick={refreshLocal} disabled={scanning || !isFsSupported()}>刷新目录</button>
            {!isFsSupported() && (
              <>
                <button className="btn" onClick={async () => {
                  setScanning(true)
                  setFileMsg('')
                  try {
                    const input = document.createElement('input')
                    input.type = 'file'
                    input.multiple = true
                    input.accept = 'audio/*'
                    input.onchange = async () => {
                      const files = input.files
                      if (!files || !files.length) return
                      const fp = createFileInputProvider(files)
                      registerProvider(fp)
                      const paths = await fp.listAudioFilesRecursively('/')
                      const tracks = paths.map(p => ({
                        uid: `${fp.id}:${p}`,
                        id: `${fp.id}:${p}`,
                        filename: p.split('/').pop() || 'audio',
                        addedAt: Date.now(),
                        sources: [{ kind: 'indexeddb', locator: `${fp.id}:${p}`, providerId: fp.id, primary: true }],
                        format: extToFormat(p),
                        sourceType: 'custom',
                        sourceRef: { providerId: fp.id, pathOrKey: p }
                      })) as any
                      useLibrary.getState().upsertTracks(tracks)
                      for (const p of paths) {
                        const id = `${fp.id}:${p}`
                        const f = await fp.readFile(p)
                        await putBlob('audioBlobs', id, f)
                      }
                      if (!player.currentTrackId && tracks.length) player.setQueue(tracks.map((t: any) => t.uid))
                      await flushAll()
                      setFileMsg(`已导入 ${paths.length} 个文件`)
                    }
                    input.click()
                  } finally { setScanning(false) }
                }}>选择文件</button>
                <button className="btn" onClick={async () => {
                  setScanning(true)
                  setFileMsg('')
                  try {
                    const input = document.createElement('input') as any
                    input.type = 'file'
                    input.webkitdirectory = true
                    input.onchange = async () => {
                      const files = input.files
                      if (!files || !files.length) return
                      const fp = createFileInputProvider(files)
                      registerProvider(fp)
                      const paths = await fp.listAudioFilesRecursively('/')
                      const tracks = paths.map(p => ({
                        uid: `${fp.id}:${p}`,
                        id: `${fp.id}:${p}`,
                        filename: p.split('/').pop() || 'audio',
                        addedAt: Date.now(),
                        sources: [{ kind: 'indexeddb', locator: `${fp.id}:${p}`, providerId: fp.id, primary: true }],
                        format: extToFormat(p),
                        sourceType: 'custom',
                        sourceRef: { providerId: fp.id, pathOrKey: p }
                      })) as any
                      useLibrary.getState().upsertTracks(tracks)
                      for (const p of paths) {
                        const id = `${fp.id}:${p}`
                        const f = await fp.readFile(p)
                        await putBlob('audioBlobs', id, f)
                      }
                      if (!player.currentTrackId && tracks.length) player.setQueue(tracks.map((t: any) => t.uid))
                      await flushAll()
                      setFileMsg(`已导入 ${paths.length} 个文件`)
                    }
                    input.click()
                  } finally { setScanning(false) }
                }}>选择文件夹</button>
              </>
            )}
          </div>
          <div className="col" style={{ gap: 4, marginTop: 8 }}>
            {!!snapMsg && <div className="muted">{snapMsg}</div>}
            <div className="muted">目录绑定：{rootSelected ? '已绑定' : '未绑定'}</div>
            <div className="muted">曲库条数：{libCount}</div>
            <div className="muted">歌单数量：{plsCount}</div>
            <div className="col" style={{ gap: 6, marginTop: 8 }}>
              {Object.keys(roots).length ? (<div className="muted">已授权目录：</div>) : (<div className="muted">尚未添加本地目录</div>)}
              {Object.keys(roots).map(rid => (
                <div className="row" key={rid} style={{ gap: 8, alignItems: 'center' }}>
                  <span className="muted">{rootNames[rid] || rid}</span>
                  <button className="btn" onClick={async () => {
                    setScanning(true)
                    try {
                      const provider = createLocalFSProvider(`localfs:${rid}`)
                      registerProvider(provider)
                      ;(provider as any).setRootHandle(roots[rid])
                      const files = await provider.listAudioFilesRecursively('/')
                      const existing = new Set(Object.keys(library.tracks))
                      const news = files.filter(p => !existing.has(`${provider.id}:${p}`))
                      if (!news.length) return
                      const batch = 5
                      for (let i = 0; i < news.length; i += batch) {
                        const slice = news.slice(i, i + batch)
                        const results = await Promise.all(slice.map(async p => {
                          try {
                            const blob = await provider.readFile(p)
                            const name = p.split('/').pop() || 'audio'
                            const track = await (await import('../services/metadata/metadata')).buildTrackFromBlob({ blob, name, providerId: provider.id, pathOrKey: p, sourceType: 'localfs' })
                            return { ...track, sourceRef: { ...track.sourceRef, rootId: rid } }
                          } catch { return null }
                        }))
                        const valid = results.filter(Boolean) as any[]
                        if (valid.length) { library.upsertTracks(valid); scheduleFlush() }
                        await new Promise(r => setTimeout(r, 0))
                      }
                    } finally { setScanning(false) }
                  }} disabled={scanning}>刷新</button>
                  <input value={rootNames[rid] || ''} onChange={async e => {
                    const n = { ...(await getRootNamesMap()), [rid]: e.target.value }
                    await setRootNamesMap(n)
                    setRootNames(n)
                  }} style={{ width: 160 }} />
                  <button className="btn" onClick={async () => {
                    const saved = (await getJSON<Record<string, FileSystemDirectoryHandle>>('fs.rootHandles')) || {}
                    const next = { ...saved }
                    delete next[rid]
                    await putJSON('fs.rootHandles', next)
                    setRoots(next)
                    const names = (await getRootNamesMap()) || {}
                    const nextNames = { ...names }
                    delete nextNames[rid]
                    await setRootNamesMap(nextNames)
                    setRootNames(nextNames)
                    try {
                      const target = await getJSON<string>('fs.snapshotTarget')
                      if (target === rid) {
                        const remain = Object.keys(next)
                        if (remain.length) { await setSnapshotTarget(remain[0]); setSnapshotTargetId(remain[0]) }
                        else { await putJSON('fs.snapshotTarget', null as any); setSnapshotTargetId(null) }
                      }
                    } catch {}
                  }} disabled={scanning}>移除</button>
                  <button className="btn" onClick={async () => { await setSnapshotTarget(rid); setSnapshotTargetId(rid) }} disabled={scanning || snapshotTargetId === rid}>设为快照目标</button>
                  {snapshotTargetId === rid && (<span className="muted">(当前快照目标)</span>)}
                </div>
              ))}
            </div>
          </div>
          {!!fileMsg && <div className="muted">{fileMsg}</div>}
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
      <div className="resizer resizer-right" onMouseDown={startResize} />
    </div>
  )
}
