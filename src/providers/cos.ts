import type { SourceProvider } from './types'
import { useSettings } from '../stores/settings'
import COS from 'cos-js-sdk-v5'
import { devlog, devwarn } from '@/utils/devlog'

function isAudio(name: string) {
  const ext = name.split('.').pop()?.toLowerCase()
  return !!ext && ['mp3', 'wav', 'flac', 'aac', 'm4a', 'ogg', 'oga'].includes(ext)
}

export function createCOSProvider(): SourceProvider {
  const id = 'cos'
  let cos: any
  function ensure() {
    const s = useSettings.getState().cos
    cos = new COS({
      getAuthorization: (_: any, cb: any) => {
        cb({ TmpSecretId: s.tmpSecretId, TmpSecretKey: s.tmpSecretKey, XCosSecurityToken: s.sessionToken, StartTime: 0, ExpiredTime: Math.floor(Date.now() / 1000) + 3600 })
      }
    })
    devlog('provider:cos', 'connect')
  }
  async function getObjectUrl(key: string) {
    const s = useSettings.getState().cos
    return await new Promise<string>((resolve, reject) => cos.getObjectUrl({ Bucket: `${s.bucket}`, Region: `${s.region}`, Key: key, Sign: true }, (err: any, data: any) => err ? reject(err) : resolve(data.Url)))
  }
  return {
    id,
    type: 'custom',
    name: '腾讯云COS',
    async connect() { ensure() },
    async listAudioFilesRecursively(root: string) {
      ensure()
      const s = useSettings.getState().cos
      const prefix = s.prefix || ''
      const keys: string[] = []
      let marker: string | undefined
      while (true) {
        const data: any = await new Promise((resolve, reject) => cos.getBucket({ Bucket: `${s.bucket}`, Region: `${s.region}`, Prefix: prefix, Marker: marker, MaxKeys: 1000 }, (err: any, d: any) => err ? reject(err) : resolve(d)))
        const arr = (data.Contents || []).map((o: any) => o.Key).filter((k: string) => isAudio(k))
        keys.push(...arr)
        if (!data.IsTruncated) break
        marker = data.NextMarker
      }
      devlog('provider:cos', 'list', { count: keys.length })
      return keys
    },
    async readFile(path: string) {
      ensure()
      try {
        const url = await getObjectUrl(path)
        const res = await fetch(url)
        const blob = await res.blob()
        devlog('provider:cos', 'read', { path })
        return blob
      } catch (e) { devwarn('provider:cos', 'read failed', { path, err: String(e) }); throw e }
    }
  }
}
