import { parseBlob } from 'music-metadata-browser'
import type { Track, AudioFormat } from '../../providers/types'
import { devlog, devwarn } from '@/utils/devlog'

function toDataUrl(pic?: { data: Uint8Array; format: string }) {
  if (!pic) return undefined
  const u8 = pic.data.slice()
  const blob = new Blob([u8.buffer], { type: pic.format || 'image/jpeg' })
  return URL.createObjectURL(blob)
}

export function extToFormat(name: string): AudioFormat {
  const ext = name.split('.').pop()?.toLowerCase()
  if (!ext) return 'unknown'
  if (ext === 'mp3') return 'mp3'
  if (ext === 'wav') return 'wav'
  if (ext === 'flac') return 'flac'
  if (ext === 'aac' || ext === 'm4a') return 'aac'
  if (ext === 'ogg' || ext === 'oga') return 'ogg'
  return 'unknown'
}

export async function buildTrackFromBlob(params: {
  blob: Blob
  name: string
  providerId: string
  pathOrKey: string
  sourceType: Track['sourceType']
  skipCover?: boolean
}): Promise<Track> {
  const { blob, name, providerId, pathOrKey, sourceType } = params
  devlog('metadata', 'parse start', { name, size: blob.size })
  let title = name.replace(/\.[^.]+$/, '')
  let artist = ''
  let album = ''
  let duration: number | undefined
  let cover: string | undefined
  let albumArtist: string | undefined
  let year: number | undefined
  let trackNo: number | undefined
  let discNo: number | undefined
  let bitrate: number | undefined
  let sampleRate: number | undefined
  let channels: number | undefined

  try {
    const meta = await parseBlob(blob)
    title = meta.common.title || title
    artist = meta.common.artist || ''
    album = meta.common.album || ''
    duration = meta.format.duration
    albumArtist = meta.common.albumartist || undefined
    year = meta.common.year || undefined
    trackNo = meta.common.track.no || undefined
    discNo = meta.common.disk.no || undefined
    bitrate = meta.format.bitrate ? Math.round(meta.format.bitrate) : undefined
    sampleRate = meta.format.sampleRate || undefined
    channels = meta.format.numberOfChannels || undefined
    if (!params.skipCover) {
      const pic = meta.common.picture?.[0]
      cover = toDataUrl(pic)
    }
    devlog('metadata', 'parsed', { title, artist, album, duration: duration || 0, cover: !!cover })
  } catch {}

  const format = extToFormat(name)
  devlog('metadata', 'format', { name, format })
  return {
    id: `${providerId}:${pathOrKey}`,
    title,
    artist,
    album,
    albumArtist,
    trackNo,
    discNo,
    duration,
    year,
    genres: [],
    cover,
    format,
    bitrate,
    sampleRate,
    channels,
    sourceType,
    sourceRef: { providerId, pathOrKey }
  }
}
