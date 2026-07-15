import type { SourceAdapter } from '@/adapters/types'
import type { Track } from '@/models/track'
import { setBlob, getBlob } from '@/services/db'
import { UriResolver } from '@/core/uriResolver'
import * as mm from 'music-metadata'

const MAX_METADATA_SIZE = 100 * 1024 * 1024 // 100MB

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
      const blobId = crypto.randomUUID()
      await setBlob(blobId, file)

      const uri = UriResolver.generate(this.id, 'track', blobId, {
        name: file.name,
        type: file.type,
        size: String(file.size),
        lastModified: String(file.lastModified)
      })

      let title = file.name
      let artist: string | undefined
      let album: string | undefined
      let duration: number | undefined
      let coverUrl: string | undefined
      let sampleRate: number | undefined
      let bitDepth: number | undefined
      let bitrate: number | undefined
      let channels: number | undefined
      let codec: string | undefined
      let container: string | undefined
      let lossless: boolean | undefined

      // Parse ID3 metadata for files under 100MB
      if (file.size < MAX_METADATA_SIZE) {
        try {
          const metadata = await mm.parseBlob(file)
          const common = metadata.common
          const fmt = metadata.format
          title = common.title || file.name
          artist = common.artist
          album = common.album
          duration = fmt.duration
          sampleRate = fmt.sampleRate
          bitDepth = fmt.bitsPerSample
          bitrate = fmt.bitrate
          channels = fmt.numberOfChannels
          codec = fmt.codec
          container = fmt.container
          lossless = fmt.lossless

          // Extract cover art
          if (common.picture && common.picture.length > 0) {
            const pic = common.picture[0]
            const coverBlob = new Blob([pic.data], { type: pic.format })
            const coverBlobId = `cover:${blobId}`
            await setBlob(coverBlobId, coverBlob)
            coverUrl = UriResolver.generate(this.id, 'blob', coverBlobId, { type: 'cover' })
          }
        } catch {
          // Fallback to filename on parse failure
          title = file.name
        }
      }

      tracks.push({
        id: blobId,
        uri,
        title,
        artist,
        album,
        coverUrl,
        duration,
        sourceId: this.id,
        sourceRef: { name: file.name, type: file.type, blobId },
        url: undefined,
        format: file.type,
        sampleRate,
        bitDepth,
        bitrate,
        channels,
        codec,
        container,
        lossless,
        fileSize: file.size,
      })
    }
    return tracks
  }

  async loadByUri(resourceId: string, params: Record<string, string>): Promise<{ url: string | Blob }> {
    // Handle cover art requests
    if (params.type === 'cover' || resourceId.startsWith('cover:')) {
      const blob = await getBlob(resourceId)
      if (!blob) {
        throw new Error(`Cover blob not found: ${resourceId}`)
      }
      return { url: blob }
    }
    const blob = await getBlob(resourceId)
    if (!blob) {
      throw new Error(`File blob not found: ${resourceId}`)
    }
    return { url: blob }
  }
}

export const fileSystemAdapter = new FileSystemAdapter()
