import type { SourceAdapter, LoadByUriMetadata } from '@/adapters/types'
import type { Track } from '@/models/track'
import { UriResolver } from '@/core/uriResolver'
import { BilibiliClient } from '@/services/bilibiliClient'
import { useSettingsStore } from '@/store/settings'
import * as mm from 'music-metadata'

const BILIBILI_URL_PATTERN = /bilibili\.com\/video\/([a-zA-Z0-9]+)/
const BV_PATTERN = /^BV[a-zA-Z0-9]{10}$/
const AV_PATTERN = /^av(\d+)$/i
const AU_PATTERN = /^au(\d+)$/i
const AU_URL_PATTERN = /bilibili\.com\/audio\/au(\d+)/
const B23_PATTERN = /^https?:\/\/b23\.tv\/[a-zA-Z0-9]+/
const FAV_PATTERN = /space\.bilibili\.com\/(\d+)\/favlist\?fid=(\d+)/

const QUALITY_MAP: Record<string, number> = {
  low: 30216,
  standard: 30232,
  high: 30280,
}

class BilibiliAdapter implements SourceAdapter {
  id = 'bilibili'
  name = 'Bilibili'

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
    if (BILIBILI_URL_PATTERN.test(input)) return true
    if (BV_PATTERN.test(input.trim())) return true
    if (AV_PATTERN.test(input.trim())) return true
    if (AU_PATTERN.test(input.trim())) return true
    if (AU_URL_PATTERN.test(input)) return true
    if (B23_PATTERN.test(input.trim())) return true
    if (FAV_PATTERN.test(input)) return true
    return false
  }

  private parseInput(input: string): { type: string; value: string } {
    const trimmed = input.trim()

    const favMatch = trimmed.match(FAV_PATTERN)
    if (favMatch) {
      return { type: 'fav', value: `${favMatch[1]}:${favMatch[2]}` }
    }

    const bvidUrlMatch = trimmed.match(BILIBILI_URL_PATTERN)
    if (bvidUrlMatch) {
      return { type: 'bvid', value: bvidUrlMatch[1] }
    }

    if (B23_PATTERN.test(trimmed)) {
      return { type: 'b23', value: trimmed }
    }

    if (BV_PATTERN.test(trimmed)) {
      return { type: 'bvid', value: trimmed }
    }

    const avMatch = trimmed.match(AV_PATTERN)
    if (avMatch) {
      return { type: 'aid', value: avMatch[1] }
    }

    const auUrlMatch = trimmed.match(AU_URL_PATTERN)
    if (auUrlMatch) {
      return { type: 'au', value: auUrlMatch[1] }
    }

    const auMatch = trimmed.match(AU_PATTERN)
    if (auMatch) {
      return { type: 'au', value: auMatch[1] }
    }

    throw new Error(`Cannot parse Bilibili URL: ${input}`)
  }

  async resolve(input: unknown): Promise<Track[]> {
    const inputs = Array.isArray(input) ? (input as string[]) : [input as string]
    const client = new BilibiliClient()
    const allTracks: Track[] = []

    for (const raw of inputs) {
      let parsed = this.parseInput(raw)

      // Resolve short links
      if (parsed.type === 'b23') {
        const resolved = await client.resolveShortLink(parsed.value)
        if (resolved.startsWith('BV')) {
          parsed = { type: 'bvid', value: resolved }
        } else {
          parsed = { type: 'aid', value: resolved.replace('av', '') }
        }
      }

      // Resolve AU pages
      if (parsed.type === 'au') {
        const resolved = await client.resolveAuPage(parsed.value)
        parsed = { type: 'bvid', value: resolved.bvid }
      }

      if (parsed.type === 'bvid' || parsed.type === 'aid') {
        if (parsed.type === 'aid') {
          // Convert aid to bvid by fetching video info
          const audioInfo = await client.getAudioInfo(parsed.value)
          if (audioInfo.code !== 0 || !audioInfo.data) {
            throw new Error(`Video not found (aid: ${parsed.value})`)
          }
          parsed = { type: 'bvid', value: audioInfo.data.bvid }
        }

        const videoInfo = await client.getVideoInfo(parsed.value)
        if (videoInfo.code !== 0 || !videoInfo.data) {
          throw new Error(`Video not found (BV: ${parsed.value})`)
        }

        const video = videoInfo.data
        const pages = video.pages || []

        if (pages.length > 1) {
          // Multi-P video: create a track for each page
          for (const page of pages) {
            allTracks.push(this.mapPageToTrack(video, page))
          }
        } else {
          // Single-P video: one track
          allTracks.push(this.mapVideoToTrack(video))
        }
      } else if (parsed.type === 'fav') {
        const [uid, fid] = parsed.value.split(':')
        const tracks = await this.resolveFavList(client, uid, fid)
        allTracks.push(...tracks)
      }
    }

    return allTracks
  }

  private async resolveFavList(
    client: BilibiliClient,
    uid: string,
    fid: string,
  ): Promise<Track[]> {
    const tracks: Track[] = []
    let page = 1
    let hasMore = true

    while (hasMore) {
      const favList = await client.getFavList(uid, fid, page)
      if (favList.code !== 0 || !favList.data) {
        throw new Error(`Favorite list not found (fid: ${fid})`)
      }

      for (const item of favList.data.medias) {
        tracks.push({
          id: crypto.randomUUID(),
          uri: UriResolver.generate(this.id, 'track', item.bvid, {
            cid: String(item.cid || 0),
            quality: 'standard',
          }),
          title: item.title,
          artist: item.upper?.name,
          album: 'Bilibili',
          coverUrl: item.cover ? this.rewriteCdnUrl(item.cover) : undefined,
          duration: item.duration,
          sourceId: this.id,
          sourceRef: { type: 'video', bvid: item.bvid, cid: item.cid, aid: item.id },
          format: 'm4a',
        })
      }

      hasMore = favList.data.has_more
      page++
    }

    return tracks
  }

  async loadByUri(
    resourceId: string,
    params: Record<string, string>,
  ): Promise<{ url: string | Blob; metadata?: LoadByUriMetadata }> {
    const client = new BilibiliClient()
    const cid = params.cid || '0'
    const quality = QUALITY_MAP[params.quality || 'standard'] || QUALITY_MAP['low']
    const settings = useSettingsStore()

    // Use standard quality only if cookie is available
    const effectiveQuality = settings.settings.bilibiliSessdata ? quality : QUALITY_MAP['low']

    const playurlData = await client.getPlayurl(resourceId, cid, effectiveQuality)
    if (playurlData.code !== 0 || !playurlData.data) {
      throw new Error(`Failed to get playback URL (BV: ${resourceId})`)
    }

    const dash = playurlData.data.dash
    if (!dash || !dash.audio || dash.audio.length === 0) {
      throw new Error('This video has no playable audio stream')
    }

    const audioStream = dash.audio[0]
    const cdnUrl = audioStream.baseUrl

    // Pre-populate metadata from API response
    const apiMetadata: LoadByUriMetadata = {}
    if (audioStream.bandWidth) {
      apiMetadata.bitrate = audioStream.bandWidth
    }
    if (audioStream.mimeType) {
      apiMetadata.codec = audioStream.mimeType
    }

    // Bilibili CDN requires Referer: https://www.bilibili.com.
    // Browsers set this automatically for same-origin but not cross-origin.
    // Strategy: try direct fetch with no-referrer first (some CDNs accept it),
    // then fall back to Vite proxy which adds the proper Referer header.
    try {
      const blob = await this.tryFetchAudio(cdnUrl)

      // Parse blob to extract full audio metadata
      let parsedMetadata: LoadByUriMetadata | undefined
      try {
        const meta = await mm.parseBlob(blob)
        const fmt = meta.format
        parsedMetadata = {
          sampleRate: fmt.sampleRate,
          bitrate: fmt.bitrate || apiMetadata.bitrate,
          bitDepth: fmt.bitsPerSample,
          channels: fmt.numberOfChannels,
          codec: fmt.codec || apiMetadata.codec,
          container: fmt.container,
          lossless: fmt.lossless,
        }
      } catch {
        // Fall back to API metadata only
        parsedMetadata = apiMetadata
      }

      return { url: blob, metadata: parsedMetadata }
    } catch {
      // Fallback: return direct CDN URL, browser may handle it
      return { url: cdnUrl, metadata: apiMetadata }
    }
  }

  private async tryFetchAudio(cdnUrl: string): Promise<Blob> {
    // Strategy A: Direct fetch with no-referrer
    try {
      const response = await fetch(cdnUrl, { referrerPolicy: 'no-referrer' })
      if (response.ok) {
        return await response.blob()
      }
    } catch {
      // Network error, try next strategy
    }

    // Strategy B: Fetch through Vite proxy (adds Referer header server-side)
    const proxiedUrl = this.rewriteCdnUrl(cdnUrl)
    const response = await fetch(proxiedUrl)
    if (!response.ok) {
      throw new Error(`CDN request failed: ${response.status}`)
    }
    return await response.blob()
  }

  /**
   * Rewrite a Bilibili CDN URL through the Vite proxy
   * to add the required Referer header.
   * Format: /api/bilibili-cdn/<hostname>/<path>
   */
  private rewriteCdnUrl(cdnUrl: string): string {
    try {
      const url = new URL(cdnUrl)
      return `/api/bilibili-cdn/${url.hostname}${url.pathname}${url.search}`
    } catch {
      return cdnUrl
    }
  }

  private mapVideoToTrack(video: import('@/models/bilibili').BilibiliVideoData): Track {
    const page = video.pages?.[0] || { cid: video.cid, page: 1, part: video.title, duration: video.duration }
    return this.mapPageToTrack(video, page)
  }

  private mapPageToTrack(
    video: import('@/models/bilibili').BilibiliVideoData,
    page: import('@/models/bilibili').BilibiliPage,
  ): Track {
    return {
      id: crypto.randomUUID(),
      uri: UriResolver.generate(this.id, 'track', video.bvid, {
        cid: String(page.cid),
        quality: 'standard',
      }),
      title: page.part || video.title,
      artist: video.owner?.name,
      album: 'Bilibili',
      coverUrl: video.pic ? this.rewriteCdnUrl(video.pic) : undefined,
      duration: page.duration || video.duration,
      sourceId: this.id,
      sourceRef: { type: 'video', bvid: video.bvid, cid: page.cid, aid: video.aid },
      format: 'm4a',
    }
  }
}

export const bilibiliAdapter = new BilibiliAdapter()
