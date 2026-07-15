import CryptoJS from 'crypto-js'

const NAV_API = '/api/bilibili/x/web-interface/nav'
const MIXIN_KEY_LEN = 32
const KEY_CACHE_DURATION = 30 * 60 * 1000 // 30 minutes

const SHUFFLE_TABLE = [
  46, 47, 18, 2, 53, 8, 23, 32, 15, 50, 10, 31, 58, 3, 45, 35,
  27, 43, 5, 49, 33, 9, 42, 19, 29, 28, 14, 39, 12, 38, 41, 13,
  37, 48, 7, 16, 24, 55, 40, 61, 26, 17, 0, 1, 60, 51, 30, 4,
  22, 25, 54, 21, 56, 59, 6, 63, 57, 62, 11, 36, 20, 52, 44, 34,
]

interface WbiKeyCache {
  imgKey: string
  subKey: string
  mixinKey: string
  expiresAt: number
}

interface NavResponse {
  code: number
  data?: {
    wbi_img?: {
      img_url: string
      sub_url: string
    }
  }
}

let keyCache: WbiKeyCache | null = null

function extractKey(url: string): string {
  const fileName = url.split('/').pop() || ''
  return fileName.split('.')[0]
}

function shuffleKeys(raw: string): string {
  const chars = raw.split('')
  const result: string[] = []
  for (let i = 0; i < MIXIN_KEY_LEN; i++) {
    const idx = SHUFFLE_TABLE[i]
    if (idx < chars.length) {
      result.push(chars[idx])
    }
  }
  return result.join('')
}

export function clearKeyCache(): void {
  keyCache = null
}

async function fetchKeys(): Promise<WbiKeyCache> {
  const response = await fetch(NAV_API, {
    headers: { Referer: 'https://www.bilibili.com' },
  })
  if (!response.ok) {
    throw new Error(`Failed to fetch Wbi keys: ${response.status}`)
  }

  const json = (await response.json()) as NavResponse
  // Bilibili nav API returns code=-101 when not logged in,
  // but wbi_img is still present in the response
  if (!json.data?.wbi_img) {
    throw new Error('Failed to get Wbi keys from nav API')
  }

  const imgKey = extractKey(json.data.wbi_img.img_url)
  const subKey = extractKey(json.data.wbi_img.sub_url)
  const mixinKey = shuffleKeys(imgKey + subKey)

  return {
    imgKey,
    subKey,
    mixinKey,
    expiresAt: Date.now() + KEY_CACHE_DURATION,
  }
}

async function getMixinKey(): Promise<string> {
  if (keyCache && Date.now() < keyCache.expiresAt) {
    return keyCache.mixinKey
  }
  keyCache = await fetchKeys()
  return keyCache.mixinKey
}

/**
 * Sign request parameters using Bilibili Wbi signing.
 * Appends w_rid (MD5 signature) and wts (unix timestamp) to the params.
 */
export async function wbiSign(
  params: Record<string, string | number>,
): Promise<Record<string, string>> {
  const mixinKey = await getMixinKey()
  const wts = Math.floor(Date.now() / 1000)

  const signParams: Record<string, string> = {}
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null) {
      signParams[k] = String(v)
    }
  }
  signParams['wts'] = String(wts)

  const sortedKeys = Object.keys(signParams).sort()
  const queryParts = sortedKeys.map((key) => `${key}=${encodeURIComponent(signParams[key])}`)
  const queryString = queryParts.join('&')

  const signStr = queryString + mixinKey
  const wRid = CryptoJS.MD5(signStr).toString()

  return { ...signParams, w_rid: wRid }
}
