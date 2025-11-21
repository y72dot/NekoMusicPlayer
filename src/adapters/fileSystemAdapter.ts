import type { SourceAdapter } from './types'
import type { Track } from '../models/track'
import { setBlob, getBlob } from '../services/db'

class FileSystemAdapter implements SourceAdapter {
  id = 'fs'
  name = 'File System'
  canResolve(input: unknown): boolean {
    if (Array.isArray(input)) return input.every(x => x instanceof File)
    return input instanceof File
  }
  async resolve(input: unknown): Promise<Track[]> {
    const files = Array.isArray(input) ? input as File[] : [input as File]
    const tracks: Track[] = []
    for (const file of files) {
      const id = crypto.randomUUID()
      await setBlob(id, file)
      tracks.push({
        id,
        title: file.name,
        artist: undefined,
        album: undefined,
        coverUrl: undefined,
        duration: undefined,
        sourceId: this.id,
        sourceRef: { name: file.name, type: file.type, blobId: id },
        url: URL.createObjectURL(file),
        format: file.type,
      })
    }
    return tracks
  }
  async load(track: Track): Promise<{ url: string | Blob }> {
    const ref = track.sourceRef as { blobId?: string }
    if (ref?.blobId) {
      const blob = await getBlob(ref.blobId)
      if (blob) return { url: blob }
    }
    return { url: track.url! }
  }
}

export const fileSystemAdapter = new FileSystemAdapter()