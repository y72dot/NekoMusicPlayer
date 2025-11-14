import type { SourceProvider } from './types'
import { buildTrackFromBlob } from '../services/metadata/metadata'
import { devlog } from '@/utils/devlog'

async function* walk(dir: FileSystemDirectoryHandle, path = ''): AsyncGenerator<{ handle: FileSystemFileHandle; path: string }> {
  for await (const [name, handle] of (dir as any).entries()) {
    const p = path ? `${path}/${name}` : name
    if (handle.kind === 'directory') {
      yield* walk(handle as FileSystemDirectoryHandle, p)
    } else if (handle.kind === 'file') {
      yield { handle: handle as FileSystemFileHandle, path: p }
    }
  }
}

function isAudio(name: string) {
  const ext = name.split('.').pop()?.toLowerCase()
  return !!ext && ['mp3', 'wav', 'flac', 'aac', 'm4a', 'ogg', 'oga'].includes(ext)
}

export function createLocalFSProvider(customId?: string): SourceProvider & { setRootHandle(h: FileSystemDirectoryHandle): void, getRootHandle(): FileSystemDirectoryHandle | null } {
  const id = customId || 'localfs'
  let rootHandle: FileSystemDirectoryHandle | null = null

  return {
    id,
    type: 'localfs',
    name: '本地文件',
    async connect() {
      rootHandle = await (window as any).showDirectoryPicker()
      devlog('provider:localfs', 'connect')
    },
    setRootHandle(h: FileSystemDirectoryHandle) {
      rootHandle = h
    },
    getRootHandle() {
      return rootHandle
    },
    async listAudioFilesRecursively(root: string) {
      if (!rootHandle) throw new Error('not connected')
      const result: string[] = []
      for await (const { handle, path } of walk(rootHandle)) {
        if (!isAudio(handle.name)) continue
        result.push(path)
      }
      devlog('provider:localfs', 'list', { count: result.length })
      return result
    },
    async readFile(path: string) {
      if (!rootHandle) throw new Error('not connected')
      const segments = path.split('/').filter(Boolean)
      let dir: FileSystemDirectoryHandle = rootHandle
      for (let i = 0; i < segments.length - 1; i++) {
        dir = await dir.getDirectoryHandle(segments[i])
      }
      const fileHandle = await dir.getFileHandle(segments[segments.length - 1])
      const file = await fileHandle.getFile()
      devlog('provider:localfs', 'read', { path })
      return file
    }
  }
}

export async function scanLocalFSTracks(provider: ReturnType<typeof createLocalFSProvider>) {
  const files = await provider.listAudioFilesRecursively('/')
  const tracks: any[] = []
  for (const p of files) {
    const blob = await provider.readFile(p)
    const track = await buildTrackFromBlob({
      blob,
      name: p.split('/').pop() || 'audio',
      providerId: provider.id,
      pathOrKey: p,
      sourceType: 'localfs'
    })
    tracks.push({ track, blob })
  }
  return tracks
}
