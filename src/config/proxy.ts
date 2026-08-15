export const API_PATHS = {
  netease: '/api/netease',
  neteaseMedia: '/api/netease-media',
  bilibili: '/api/bilibili',
  bilibiliAudio: '/api/bilibili-audio',
  bilibiliCdn: '/api/bilibili-cdn',
} as const

export const UPSTREAM_COOKIE_HEADER = 'X-Neko-Upstream-Cookie'

const BILIBILI_CDN_SUFFIXES = ['.bilivideo.com', '.hdslb.com'] as const
const NETEASE_MEDIA_SUFFIX = '.music.126.net'

export function isAllowedNeteaseMediaHost(hostname: string): boolean {
  const normalized = hostname.toLowerCase().replace(/\.$/, '')
  if (!normalized || normalized === 'localhost' || normalized.includes(':')) return false
  return normalized.endsWith(NETEASE_MEDIA_SUFFIX) && normalized.length > NETEASE_MEDIA_SUFFIX.length
}

export function toNeteaseMediaProxyUrl(rawUrl: string): string | undefined {
  try {
    const url = new URL(rawUrl)
    if (!['http:', 'https:'].includes(url.protocol) || !isAllowedNeteaseMediaHost(url.hostname)) return undefined
    const protocol = url.protocol.slice(0, -1)
    return `${API_PATHS.neteaseMedia}/${protocol}/${url.hostname}${url.pathname}${url.search}`
  } catch {
    return undefined
  }
}

export function isAllowedBilibiliCdnHost(hostname: string): boolean {
  const normalized = hostname.toLowerCase().replace(/\.$/, '')
  if (!normalized || normalized === 'localhost' || normalized.includes(':')) return false
  return BILIBILI_CDN_SUFFIXES.some(
    suffix => normalized.endsWith(suffix) && normalized.length > suffix.length,
  )
}

export function toBilibiliCdnProxyUrl(rawUrl: string): string | undefined {
  try {
    const url = new URL(rawUrl)
    if (url.protocol !== 'https:' || !isAllowedBilibiliCdnHost(url.hostname)) return undefined
    return `${API_PATHS.bilibiliCdn}/${url.hostname}${url.pathname}${url.search}`
  } catch {
    return undefined
  }
}
