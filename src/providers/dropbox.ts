import type { SourceProvider } from './types'
import { useSettings } from '../stores/settings'
import { devlog, devwarn } from '@/utils/devlog'

const API = 'https://api.dropboxapi.com/2'
const CONTENT = 'https://content.dropboxapi.com/2'

function isAudio(name: string) {
  const ext = name.split('.').pop()?.toLowerCase()
  return !!ext && ['mp3', 'wav', 'flac', 'aac', 'm4a', 'ogg', 'oga'].includes(ext)
}

async function listFolder(token: string, path: string, cursor?: string) {
  const url = cursor ? `${API}/files/list_folder/continue` : `${API}/files/list_folder`
  const body = cursor ? { cursor } : { path, recursive: true, include_non_downloadable_files: false }
  const res = await fetch(url, { method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
  if (!res.ok) throw new Error('dropbox list failed')
  return res.json() as Promise<{ entries: any[]; has_more: boolean; cursor: string }>
}

async function downloadFile(token: string, path: string) {
  const res = await fetch(`${CONTENT}/files/download`, { method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Dropbox-API-Arg': JSON.stringify({ path }) } })
  if (!res.ok) throw new Error('dropbox download failed')
  return await res.blob()
}

export function createDropboxProvider(): SourceProvider {
  const id = 'dropbox'
  return {
    id,
    type: 'custom',
    name: 'Dropbox',
    async connect() {
      const s = useSettings.getState().dropbox
      if (!s.accessToken) throw new Error('no token')
      devlog('provider:dropbox', 'connect')
    },
    async listAudioFilesRecursively(root: string) {
      const s = useSettings.getState().dropbox
      const token = s.accessToken
      if (!token) throw new Error('no token')
      const files: string[] = []
      let cursor: string | undefined
      let hasMore = true
      while (hasMore) {
        const data = await listFolder(token, root || '', cursor)
        for (const e of data.entries) {
          if (e['.tag'] === 'file' && isAudio(e.name)) files.push(e.path_lower)
        }
        hasMore = data.has_more
        cursor = data.cursor
      }
      devlog('provider:dropbox', 'list', { count: files.length })
      return files
    },
    async readFile(path: string) {
      const token = useSettings.getState().dropbox.accessToken
      if (!token) throw new Error('no token')
      try {
        const blob = await downloadFile(token, path)
        devlog('provider:dropbox', 'read', { path })
        return blob
      } catch (e) { devwarn('provider:dropbox', 'read failed', { path, err: String(e) }); throw e }
    }
  }
}
