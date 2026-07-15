import { wbiSign } from '@/utils/bilibiliSign'
import { useSettingsStore } from '@/store/settings'
import type {
  BilibiliVideoInfo,
  BilibiliPlayurlData,
  BilibiliAudioInfo,
  BilibiliFavList,
  BilibiliUserSpace,
} from '@/models/bilibili'

const API_BASE = '/api/bilibili'
const AUDIO_BASE = '/api/bilibili-audio'
const TIMEOUT_MS = 15000

export class BilibiliClient {
  private getCookies(): Record<string, string> {
    const settings = useSettingsStore()
    const cookies: string[] = []
    const sessdata = settings.settings.bilibiliSessdata
    const csrf = settings.settings.bilibiliCsrf
    const buvid3 = settings.settings.bilibiliBuvid3

    if (sessdata) cookies.push(`SESSDATA=${sessdata}`)
    if (csrf) cookies.push(`bili_jct=${csrf}`)
    if (buvid3) cookies.push(`buvid3=${buvid3}`)

    return cookies.length > 0 ? { Cookie: cookies.join('; ') } : {}
  }

  private getCsrf(): string {
    const settings = useSettingsStore()
    return settings.settings.bilibiliCsrf || ''
  }

  private async request<T>(
    url: string,
    params: Record<string, string | number>,
  ): Promise<T> {
    const signedParams = await wbiSign(params)
    const queryParts = Object.entries(signedParams).map(
      ([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`,
    )
    const fullUrl = `${url}?${queryParts.join('&')}`

    const headers: Record<string, string> = {
      Referer: 'https://www.bilibili.com',
      ...this.getCookies(),
    }

    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS)

    try {
      const response = await fetch(fullUrl, {
        method: 'GET',
        headers,
        signal: controller.signal,
      })

      if (response.status === 401 || response.status === 403) {
        throw new Error('Bilibili Cookie expired, please re-obtain')
      }

      if (!response.ok) {
        throw new Error(`Request failed: ${response.status} ${response.statusText}`)
      }

      const json = (await response.json()) as any

      if (json.code === -352) {
        throw new Error('Request rate too high, please try again later')
      }
      if (json.code === -412) {
        throw new Error('Access denied, please verify Cookie')
      }
      if (json.code === -509) {
        throw new Error('Bilibili rate limited, please try again later')
      }
      if (json.code === -404 || json.code === 12002) {
        throw new Error('Video not found')
      }

      return json as T
    } catch (e) {
      if (e instanceof DOMException && e.name === 'AbortError') {
        throw new Error('Request timed out, please check your network')
      }
      throw e
    } finally {
      clearTimeout(timer)
    }
  }

  async getVideoInfo(bvid: string): Promise<BilibiliVideoInfo> {
    return this.request<BilibiliVideoInfo>(`${API_BASE}/x/web-interface/view`, {
      bvid,
    })
  }

  async getPlayurl(
    bvid: string,
    cid: string | number,
    quality: number = 30216,
  ): Promise<BilibiliPlayurlData> {
    return this.request<BilibiliPlayurlData>(
      `${API_BASE}/x/player/playurl`,
      {
        bvid,
        cid,
        fnval: 16, // DASH format
        qn: quality,
        fourk: 1,
      },
    )
  }

  async getAudioInfo(auId: string): Promise<BilibiliAudioInfo> {
    return this.request<BilibiliAudioInfo>(
      `${API_BASE}/x/web-interface/view`,
      { aid: auId },
    )
  }

  async resolveAuPage(auId: string): Promise<{ bvid: string }> {
    const url = `${AUDIO_BASE}/audio/au${auId}`
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS)

    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: { Referer: 'https://www.bilibili.com' },
        signal: controller.signal,
        redirect: 'manual',
      })

      if (response.status >= 300 && response.status < 400) {
        const location = response.headers.get('Location') || ''
        const bvMatch = location.match(/BV[a-zA-Z0-9]+/)
        if (bvMatch) {
          return { bvid: bvMatch[0] }
        }
      }

      const html = await response.text()
      const bvMatch = html.match(/BV[a-zA-Z0-9]{10}/)
      if (bvMatch) {
        return { bvid: bvMatch[0] }
      }

      throw new Error('Could not resolve audio page to video BV')
    } finally {
      clearTimeout(timer)
    }
  }

  async resolveShortLink(shortUrl: string): Promise<string> {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS)

    try {
      const response = await fetch(shortUrl, {
        method: 'GET',
        headers: { Referer: 'https://www.bilibili.com' },
        signal: controller.signal,
        redirect: 'manual',
      })

      const location = response.headers.get('Location') || ''
      const bvMatch = location.match(/BV[a-zA-Z0-9]+/)
      const avMatch = location.match(/av(\d+)/)

      if (bvMatch) return bvMatch[0]
      if (avMatch) return `av${avMatch[1]}`

      throw new Error('Could not resolve short link')
    } finally {
      clearTimeout(timer)
    }
  }

  async getFavList(uid: string, fid: string, page: number = 1): Promise<BilibiliFavList> {
    return this.request<BilibiliFavList>(
      `${API_BASE}/x/v3/fav/resource/list`,
      {
        media_id: fid,
        up_mid: uid,
        ps: 20,
        pn: page,
        type: 2, // video type
        platform: 'web',
      },
    )
  }

  async getUserSpace(uid: string): Promise<BilibiliUserSpace> {
    return this.request<BilibiliUserSpace>(
      `${API_BASE}/x/space/wbi/acc/info`,
      { mid: uid },
    )
  }

  async checkAuth(): Promise<boolean> {
    // Bilibili works without auth, just with lower quality
    return true
  }
}
