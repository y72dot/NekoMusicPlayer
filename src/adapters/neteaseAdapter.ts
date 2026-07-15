import type { SourceAdapter, LoadByUriMetadata } from '@/adapters/types'
import type { Track } from '@/models/track'
import type { NeteaseSong } from '@/models/netease'
import { UriResolver } from '@/core/uriResolver'
import { NeteaseClient } from '@/services/neteaseClient'
import { useSettingsStore } from '@/store/settings'
import * as mm from 'music-metadata'

const NETBASE_URL_PATTERN = /music\.163\.com/
const SONG_ID_PATTERN = /^\d{4,}$/

class NeteaseAdapter implements SourceAdapter {
  id = 'netease'
  name = 'NetEase Cloud Music'

  canResolve(input: unknown): boolean {
    if (typeof input === 'string') {
      return this.canResolveSingle(input)
    }
    if (Array.isArray(input)) {
      return input.length > 0 && input.every(
        (x) => typeof x === 'string' && this.canResolveSingle(x),
      )
    }
    return false
  }

  private canResolveSingle(input: string): boolean {
    if (NETBASE_URL_PATTERN.test(input)) return true
    if (SONG_ID_PATTERN.test(input.trim())) return true
    return false
  }

  private parseInput(input: string): { type: string; id: string } {
    const urlMatch = input.match(/music\.163\.com\/(?:#\/)?(song|playlist|album|m\/song)\?(?:.*?&)?id=(\d+)/)
    if (urlMatch) {
      let type = urlMatch[1]
      if (type === 'm/song') type = 'song'
      return { type, id: urlMatch[2] }
    }
    const pureId = input.trim()
    if (/^\d+$/.test(pureId)) {
      return { type: 'song', id: pureId }
    }
    throw new Error(`Cannot parse Netease URL: ${input}`)
  }

  async resolve(input: unknown): Promise<Track[]> {
    const settings = useSettingsStore()
    if (!settings.settings.neteaseCookie) {
      throw new Error('Please configure NetEase Cookie first')
    }

    const inputs = Array.isArray(input) ? (input as string[]) : [input as string]
    const client = new NeteaseClient()
    const allTracks: Track[] = []

    for (const raw of inputs) {
      const { type, id } = this.parseInput(raw)

      if (type === 'song') {
        const detail = await client.getSongDetail([id])
        if (detail.code !== 200 || !detail.songs?.length) {
          throw new Error(`Song not found (ID: ${id})`)
        }
        allTracks.push(this.mapSongToTrack(detail.songs[0]))
      } else if (type === 'playlist') {
        const detail = await client.getPlaylistDetail(id)
        if (detail.code !== 200) {
          throw new Error(`Playlist not found (ID: ${id})`)
        }

        let songs = detail.playlist.tracks || []
        const trackIds = detail.playlist.trackIds || []

        if (trackIds.length > songs.length && trackIds.length > 0) {
          const existingIds = new Set(songs.map((s) => s.id))
          const missingIds = trackIds
            .map((t) => t.id)
            .filter((tid) => !existingIds.has(tid))

          const BATCH_SIZE = 500
          for (let i = 0; i < missingIds.length; i += BATCH_SIZE) {
            const batch = missingIds.slice(i, i + BATCH_SIZE)
            const batchDetail = await client.getSongDetail(batch.map(String))
            if (batchDetail.code === 200 && batchDetail.songs) {
              songs = songs.concat(batchDetail.songs)
            }
          }
        }

        for (const song of songs) {
          allTracks.push(this.mapSongToTrack(song))
        }
      } else if (type === 'album') {
        const detail = await client.getAlbum(id)
        if (detail.code !== 200) {
          throw new Error(`Album not found (ID: ${id})`)
        }
        const albumSongs = detail.songs || []
        for (const song of albumSongs) {
          allTracks.push(this.mapSongToTrack(song))
        }
      }
    }

    return allTracks
  }

  async loadByUri(
    resourceId: string,
    params: Record<string, string>,
  ): Promise<{ url: string | Blob; metadata?: LoadByUriMetadata }> {
    const settings = useSettingsStore()
    if (!settings.settings.neteaseCookie) {
      throw new Error('Please configure NetEase Cookie first')
    }

    const client = new NeteaseClient()
    const quality = params.quality || 'standard'

    const result = await client.getSongUrl(resourceId, quality)
    if (result.code !== 200 || !result.data?.length) {
      throw new Error(`Failed to get playback URL (ID: ${resourceId})`)
    }

    const songUrl = result.data[0]?.url
    if (!songUrl) {
      throw new Error('Song unavailable due to copyright restrictions')
    }

    // Fetch as blob and parse metadata
    try {
      const response = await fetch(songUrl)
      if (!response.ok) {
        // Fallback: return URL directly if fetch fails
        return { url: songUrl }
      }
      const blob = await response.blob()
      const objectUrl = URL.createObjectURL(blob)

      let metadata: LoadByUriMetadata | undefined
      try {
        const meta = await mm.parseBlob(blob)
        const fmt = meta.format
        metadata = {
          sampleRate: fmt.sampleRate,
          bitrate: fmt.bitrate,
          bitDepth: fmt.bitsPerSample,
          channels: fmt.numberOfChannels,
          codec: fmt.codec,
          container: fmt.container,
          lossless: fmt.lossless,
        }
      } catch {
        // Metadata parsing failed, audio still playable
      }

      return { url: objectUrl, metadata }
    } catch {
      // Fallback: return URL directly
      return { url: songUrl }
    }
  }

  private mapSongToTrack(song: NeteaseSong): Track {
    return {
      id: crypto.randomUUID(),
      uri: UriResolver.generate(this.id, 'track', String(song.id), {
        quality: 'standard',
      }),
      title: song.name,
      artist: song.ar?.map((a) => a.name).join(', '),
      album: song.al?.name,
      coverUrl: song.al?.picUrl,
      duration: song.dt ? song.dt / 1000 : undefined,
      sourceId: this.id,
      sourceRef: { type: 'song', songId: String(song.id) },
      format: 'mp3',
    }
  }
}

export const neteaseAdapter = new NeteaseAdapter()
