import type { SourceAdapter } from './types'
import type { Track } from '../models/track'
import { setBlob, getBlob } from '../services/db'
import { UriResolver } from '../core/uriResolver'

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
      // For local files, we use blobId as the resource ID
      const blobId = crypto.randomUUID()
      await setBlob(blobId, file)
      
      const uri = UriResolver.generate(this.id, 'track', blobId, {
        name: file.name,
        type: file.type,
        size: String(file.size),
        lastModified: String(file.lastModified)
      })

      tracks.push({
        id: blobId, // Using blobId as track ID for simplicity in this version
        uri,
        title: file.name,
        artist: undefined,
        album: undefined,
        coverUrl: undefined,
        duration: undefined,
        sourceId: this.id,
        sourceRef: { name: file.name, type: file.type, blobId },
        // We don't store ObjectURL anymore to avoid memory leaks and stale URLs.
        // It will be generated on demand via load()
        url: undefined, 
        format: file.type,
      })
    }
    return tracks
  }

  async load(track: Track): Promise<{ url: string | Blob }> {
    // Legacy support or direct load
    const ref = track.sourceRef as { blobId?: string }
    
    // If we have a URI, prefer loading from it (standard way)
    if (track.uri) {
      try {
        const { resourceId } = UriResolver.parse(track.uri)
        const blob = await getBlob(resourceId)
        if (blob) return { url: blob }
      } catch (e) {
        console.warn('Failed to load from URI, falling back to sourceRef', e)
      }
    }

    // Fallback to sourceRef
    if (ref?.blobId) {
      const blob = await getBlob(ref.blobId)
      if (blob) return { url: blob }
    }
    
    // Fallback to direct URL if available (though we try to avoid storing it)
    if (track.url) return { url: track.url }
    
    throw new Error('File content missing')
  }

  async loadByUri(resourceId: string, params: Record<string, string>): Promise<{ url: string | Blob }> {
    // resourceId is the blobId in our DB
    const blob = await getBlob(resourceId)
    if (!blob) {
      throw new Error(`File blob not found: ${resourceId}`)
    }
    return { url: blob }
  }
}

export const fileSystemAdapter = new FileSystemAdapter()
