import fs from 'node:fs'
import CryptoJS from 'crypto-js'
import { BigInteger } from 'jsbn'

const FIRST_KEY = '0CoJUm6Qyw8W8jud'
const IV = '0102030405060708'
const RSA_PUB_KEY = '010001'
const RSA_MODULUS = '00e0b509f6259df8642dbc35662901477df22677ec152b5ff68ace615bb7b725152b3ab17a876aea8a5aa76d2e417629ec4ee341f56135fccf695280104e0312ecbda92557c93870114af6c9d05c4f7f0c3685b7a46bee255932575cce10b424d813cfe4875d3e82047b97ddef52741d546b8e289dc6935b3ece0462db0a22b8e7'
const COOKIE_HEADER = 'X-Neko-Upstream-Cookie'
const MEDIA_HOST_SUFFIX = '.music.126.net'

function parseArgs(argv) {
  const values = new Map()
  for (let index = 0; index < argv.length; index += 2) {
    const key = argv[index]
    const value = argv[index + 1]
    if (!key?.startsWith('--') || !value) throw new Error(`invalid argument near ${key || '<end>'}`)
    values.set(key.slice(2), value)
  }
  return values
}

function aesEncrypt(text, key) {
  return CryptoJS.AES.encrypt(text, CryptoJS.enc.Utf8.parse(key), {
    iv: CryptoJS.enc.Utf8.parse(IV),
    mode: CryptoJS.mode.CBC,
    padding: CryptoJS.pad.Pkcs7,
  }).toString()
}

function rsaEncrypt(text) {
  let hex = ''
  for (let index = 0; index < text.length; index++) {
    hex += text.charCodeAt(index).toString(16).padStart(2, '0')
  }
  const result = new BigInteger(hex, 16).modPow(
    new BigInteger(RSA_PUB_KEY, 16),
    new BigInteger(RSA_MODULUS, 16),
  )
  return result.toString(16).padStart(256, '0')
}

function sign(body) {
  const alphabet = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  const random = crypto.getRandomValues(new Uint8Array(16))
  const secondKey = Array.from(random, value => alphabet[value % alphabet.length]).join('')
  const firstEncrypted = aesEncrypt(JSON.stringify(body), FIRST_KEY)
  return {
    params: aesEncrypt(firstEncrypted, secondKey),
    encSecKey: rsaEncrypt(secondKey.split('').reverse().join('')),
  }
}

function readSecret(file, label) {
  const value = fs.readFileSync(file, 'utf8').trim()
  if (!value) throw new Error(`${label} file is empty`)
  return value
}

function toMediaProxyUrl(baseUrl, rawUrl) {
  const upstream = new URL(rawUrl)
  const hostname = upstream.hostname.toLowerCase().replace(/\.$/, '')
  if (!['http:', 'https:'].includes(upstream.protocol)) throw new Error('unsupported media protocol')
  if (!hostname.endsWith(MEDIA_HOST_SUFFIX) || hostname.length <= MEDIA_HOST_SUFFIX.length) {
    throw new Error('media host is outside the NetEase allowlist')
  }
  const protocol = upstream.protocol.slice(0, -1)
  return new URL(`/api/netease-media/${protocol}/${hostname}${upstream.pathname}${upstream.search}`, baseUrl)
}

async function main() {
  const args = parseArgs(process.argv.slice(2))
  const baseUrl = new URL(args.get('base-url') || 'https://music.72dot.cn')
  const cookieFile = args.get('cookie-file')
  const csrfFile = args.get('csrf-file')
  const trackId = args.get('track-id') || '347230'
  if (!cookieFile) throw new Error('--cookie-file is required')
  if (!/^\d+$/.test(trackId)) throw new Error('--track-id must be numeric')

  const cookieSecret = readSecret(cookieFile, 'cookie')
  const csrf = csrfFile ? readSecret(csrfFile, 'csrf') : ''
  const upstreamCookie = cookieSecret.includes('MUSIC_U=')
    ? cookieSecret
    : `MUSIC_U=${cookieSecret}${csrf ? `; __csrf=${csrf}` : ''}`
  const encrypted = sign({
    ids: JSON.stringify([Number(trackId)]),
    level: 'standard',
    encodeType: 'mp3',
  })
  const endpoint = new URL('/api/netease/weapi/song/enhance/player/url/v1', baseUrl)
  endpoint.searchParams.set('csrf_token', csrf)

  const apiResponse = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      [COOKIE_HEADER]: upstreamCookie,
    },
    body: new URLSearchParams(encrypted),
    signal: AbortSignal.timeout(20_000),
  })
  if (!apiResponse.ok) throw new Error(`playback URL API returned HTTP ${apiResponse.status}`)
  const payload = await apiResponse.json()
  const rawMediaUrl = payload?.data?.[0]?.url
  if (payload?.code !== 200 || typeof rawMediaUrl !== 'string' || !rawMediaUrl) {
    throw new Error(`playback URL API returned no media URL (code ${payload?.code ?? 'unknown'})`)
  }

  const mediaUrl = toMediaProxyUrl(baseUrl, rawMediaUrl)
  const mediaResponse = await fetch(mediaUrl, {
    headers: { Range: 'bytes=0-65535' },
    redirect: 'manual',
    signal: AbortSignal.timeout(25_000),
  })
  if (![200, 206].includes(mediaResponse.status)) {
    throw new Error(`media proxy returned HTTP ${mediaResponse.status}`)
  }
  const contentType = mediaResponse.headers.get('content-type') || ''
  if (!/^(audio\/|application\/octet-stream)/i.test(contentType)) {
    throw new Error(`media proxy returned unexpected content type ${contentType || '<missing>'}`)
  }
  const reader = mediaResponse.body?.getReader()
  if (!reader) throw new Error('media proxy returned no response body')
  const firstChunk = await reader.read()
  await reader.cancel()
  if (firstChunk.done || !firstChunk.value?.byteLength) throw new Error('media proxy returned an empty body')

  console.log(JSON.stringify({
    ok: true,
    apiStatus: apiResponse.status,
    mediaStatus: mediaResponse.status,
    contentType,
    firstChunkBytes: firstChunk.value.byteLength,
  }))
}

main().catch(error => {
  console.error(`Playback acceptance failed: ${error instanceof Error ? error.message : String(error)}`)
  process.exitCode = 1
})
