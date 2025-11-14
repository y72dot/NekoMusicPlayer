import { putJSON, getJSON } from '../cache/indexeddb'
import { useSettings } from '../../stores/settings'
import { usePlaylists } from '../../stores/playlists'
import { useLibrary } from '../../stores/library'
import { devlog, devwarn } from '@/utils/devlog'

let rootHandle: FileSystemDirectoryHandle | null = null
let nmpDirHandle: FileSystemDirectoryHandle | null = null
let flushing = false
let scheduled = false

export function isFsSupported() {
  return typeof (window as any).showDirectoryPicker !== 'undefined'
}

export async function setRootHandle(h: FileSystemDirectoryHandle) {
  rootHandle = h
  await putJSON('fs.rootHandle', h)
}

export async function loadRootHandleFromIDB() {
  if (rootHandle) return rootHandle
  const h = await getJSON<FileSystemDirectoryHandle>('fs.rootHandle')
  rootHandle = h || null
  return rootHandle
}

async function ensureDir(name: string) {
  if (!rootHandle) return null
  const dir = await rootHandle.getDirectoryHandle(name, { create: true })
  return dir
}

export async function ensureNmpData() {
  if (!rootHandle) return null
  nmpDirHandle = await ensureDir('.nmpdata')
  if (!nmpDirHandle) return null
  try {
    const fh = await nmpDirHandle.getFileHandle('marker.json', { create: true })
    const w = await (fh as any).createWritable()
    const markerId = crypto.randomUUID()
    await w.write(new Blob([JSON.stringify({ rootId: markerId, storageVersion: 1, ts: Date.now() })], { type: 'application/json' }))
    await w.close()
    try { localStorage.setItem('nmp.rootMarkerId', markerId); localStorage.setItem('nmp.fsRootSelected', 'true') } catch {}
    devlog('fs', 'ensureNmpData', { marker: true })
  } catch {}
  return nmpDirHandle
}

async function getNmpDir() {
  if (nmpDirHandle) return nmpDirHandle
  if (!rootHandle) return null
  nmpDirHandle = await ensureDir('.nmpdata')
  return nmpDirHandle
}

async function writeTextFile(dir: FileSystemDirectoryHandle, name: string, text: string) {
  const fh = await dir.getFileHandle(name, { create: true })
  const w = await (fh as any).createWritable()
  await w.write(new Blob([text], { type: 'application/json' }))
  await w.close()
}

export async function writeJson(path: string, obj: any) {
  const dir = await getNmpDir()
  if (!dir) return
  const text = JSON.stringify(obj, null, 2) + "\n"
  await writeTextFile(dir, path, text)
}

export async function readJson<T = any>(path: string): Promise<T | null> {
  const dir = await getNmpDir()
  if (!dir) return null
  try {
    const fh = await dir.getFileHandle(path)
    const f = await (fh as any).getFile()
    const text = await f.text()
    return JSON.parse(text)
  } catch { return null }
}

async function getSubDir(name: string) {
  const dir = await getNmpDir()
  if (!dir) return null
  const sub = await dir.getDirectoryHandle(name, { create: true })
  return sub
}

async function toHex(u8: Uint8Array) {
  return Array.from(u8).map(b => b.toString(16).padStart(2, '0')).join('')
}

export async function hashId(id: string) {
  const enc = new TextEncoder().encode(id)
  const buf = await crypto.subtle.digest('SHA-256', enc)
  return await toHex(new Uint8Array(buf))
}

export async function writeCover(id: string, blob: Blob) {
  const sub = await getSubDir('covers')
  if (!sub) return
  const name = `${await hashId(id)}.webp`
  const fh = await sub.getFileHandle(name, { create: true })
  const w = await (fh as any).createWritable()
  await w.write(blob)
  await w.close()
}

export async function writeAudioCache(id: string, blob: Blob) {
  const sub = await getSubDir('audio-cache')
  if (!sub) return
  const name = `${await hashId(id)}.bin`
  const fh = await sub.getFileHandle(name, { create: true })
  const w = await (fh as any).createWritable()
  await w.write(blob)
  await w.close()
}

export async function flushAll() {
  if (!isFsSupported()) return
  if (!rootHandle) return
  if (flushing) { scheduled = true; return }
  flushing = true
  try {
    const settings = useSettings.getState()
    const playlists = usePlaylists.getState()
    const library = useLibrary.getState()
    const libTracks: any = {}
    for (const id of Object.keys(library.tracks)) {
      const t: any = library.tracks[id]
      const core: any = {
        uid: t.uid || t.id,
        filename: t.filename || (t.sourceRef ? (t.sourceRef.pathOrKey.split('/').pop() || 'audio') : (t.title || 'audio')),
        addedAt: t.addedAt || t.createdAt || Date.now(),
        sources: t.sources || (t.sourceRef ? [{ kind: t.sourceType === 'localfs' ? 'fs' : 'custom', locator: t.sourceRef.pathOrKey || t.sourceRef.url || '', providerId: t.sourceRef.providerId, primary: true }] : []),
        metaIndex: t.metaIndex || undefined
      }
      const meta: any = {}
      if (t.title) meta.title = t.title
      if (t.artist) meta.artist = t.artist
      if (t.album) meta.album = t.album
      if (t.albumArtist) meta.albumArtist = t.albumArtist
      if (t.genres && t.genres.length) meta.genres = t.genres
      if (t.duration && t.duration > 0) meta.duration = t.duration
      if (t.trackNo) meta.trackNo = t.trackNo
      if (t.discNo) meta.discNo = t.discNo
      if (t.year) meta.year = t.year
      if (t.format) meta.format = t.format
      if (t.sampleRate) meta.sampleRate = t.sampleRate
      if (t.channels) meta.channels = t.channels
      libTracks[core.uid] = { ...core, meta }
    }
    const playlistsV2: any = {}
    for (const pid of Object.keys(playlists.playlists)) {
      const p: any = playlists.playlists[pid]
      playlistsV2[pid] = { id: p.id, name: p.name, trackUids: (p.trackIds || []).map((x: any) => x) }
    }
    await writeJson('settings.json', { dropbox: settings.dropbox, oss: settings.oss, cos: settings.cos, preferences: settings.preferences })
    await writeJson('playlists.json', { version: 2, playlists: playlistsV2, order: playlists.order, currentPlaylistId: playlists.currentPlaylistId })
    await writeJson('library.json', { version: 2, tracks: libTracks, order: library.order.map(id => library.tracks[id]?.uid || id) })
    devlog('fs', 'flushAll', { tracks: Object.keys(libTracks).length, playlists: Object.keys(playlistsV2).length })
  } finally {
    flushing = false
    if (scheduled) { scheduled = false; flushAll() }
  }
}

export function scheduleFlush() {
  flushAll()
}

export async function clearNmpData() {
  if (!isFsSupported()) return false
  const h = await loadRootHandleFromIDB()
  if (!h) return false
  try {
    await h.removeEntry('.nmpdata', { recursive: true } as any)
  } catch {}
  try { localStorage.removeItem('nmp.fsRootSelected'); localStorage.removeItem('nmp.rootMarkerId') } catch {}
  await putJSON('fs.rootHandle', null as any)
  return true
}
