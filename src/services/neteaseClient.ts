import { sign } from '@/utils/neteaseCrypto'
import { useSettingsStore } from '@/store/settings'
import type {
  NeteaseSongDetail,
  NeteaseSongUrl,
  NeteasePlaylistDetail,
  NeteaseAlbumDetail,
  NeteaseSearchResult,
} from '@/models/netease'
import { API_PATHS, UPSTREAM_COOKIE_HEADER } from '@/config/proxy'
import { AdapterError, asAdapterError } from '@/adapters/adapterError'

const API_BASE = `${API_PATHS.netease}/weapi`
const TIMEOUT_MS = 15000

export class NeteaseClient {
  private async weapi<T>(endpoint: string, body: Record<string, unknown>): Promise<T> {
    const settings = useSettingsStore()
    const { params, encSecKey } = sign(body)
    const formBody = new URLSearchParams({ params, encSecKey })

    const csrf = settings.settings.neteaseCsrf || ''
    const url = `${API_BASE}${endpoint}?csrf_token=${encodeURIComponent(csrf)}`

    const headers: Record<string, string> = {
      'Content-Type': 'application/x-www-form-urlencoded',
    }
    if (settings.settings.neteaseCookie) {
      headers[UPSTREAM_COOKIE_HEADER] = `MUSIC_U=${settings.settings.neteaseCookie}; __csrf=${csrf}`
    }

    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS)

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers,
        body: formBody,
        signal: controller.signal,
      })

      if (response.status === 301 || response.status === 401 || response.status === 403) {
        throw new AdapterError('AUTH_REQUIRED', 'Cookie expired, please re-obtain from music.163.com', 'netease')
      }

      if (!response.ok) {
        throw new AdapterError('PROXY_UNAVAILABLE', `Request failed: ${response.status} ${response.statusText}`, 'netease', true)
      }

      return (await response.json()) as T
    } catch (e) {
      if (e instanceof DOMException && e.name === 'AbortError') {
        throw new AdapterError('TIMEOUT', 'Request timed out, please check your network', 'netease', true)
      }
      throw asAdapterError(e, 'netease')
    } finally {
      clearTimeout(timer)
    }
  }

  async getSongDetail(ids: string[]): Promise<NeteaseSongDetail> {
    return this.weapi<NeteaseSongDetail>('/v3/song/detail', {
      c: JSON.stringify(ids.map(id => ({ id }))),
    })
  }

  async getSongUrl(id: string, quality: string): Promise<NeteaseSongUrl> {
    return this.weapi<NeteaseSongUrl>('/song/enhance/player/url/v1', {
      ids: JSON.stringify([Number(id)]),
      level: quality || 'standard',
      encodeType: 'mp3',
    })
  }

  async getPlaylistDetail(id: string): Promise<NeteasePlaylistDetail> {
    return this.weapi<NeteasePlaylistDetail>('/v6/playlist/detail', {
      id,
      n: 100000,
      s: 0,
    })
  }

  async getAlbum(id: string): Promise<NeteaseAlbumDetail> {
    return this.weapi<NeteaseAlbumDetail>('/v1/album', { id })
  }

  async search(
    keyword: string,
    type: number = 1,
    limit: number = 30,
  ): Promise<NeteaseSearchResult> {
    return this.weapi<NeteaseSearchResult>('/cloudsearch/get/web', {
      s: keyword,
      type,
      limit,
    })
  }

  async checkAuth(): Promise<boolean> {
    const settings = useSettingsStore()
    return Boolean(settings.settings.neteaseCookie)
  }
}
