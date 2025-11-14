import type { SourceProvider } from './types'
import { useSettings } from '../stores/settings'
import OSS from 'ali-oss'
import { devlog, devwarn } from '@/utils/devlog'

function isAudio(name: string) {
  const ext = name.split('.').pop()?.toLowerCase()
  return !!ext && ['mp3', 'wav', 'flac', 'aac', 'm4a', 'ogg', 'oga'].includes(ext)
}

export function createOSSProvider(): SourceProvider {
  const id = 'oss'
  let client: any
  function ensure() {
    const s = useSettings.getState().oss
    client = new OSS({
      region: s.region,
      accessKeyId: s.accessKeyId,
      accessKeySecret: s.accessKeySecret,
      stsToken: s.stsToken,
      bucket: s.bucket,
      endpoint: s.endpoint,
      secure: true
    })
    devlog('provider:oss', 'connect')
  }
  return {
    id,
    type: 'custom',
    name: '阿里云OSS',
    async connect() { ensure() },
    async listAudioFilesRecursively(root: string) {
      ensure()
      const prefix = useSettings.getState().oss.prefix || ''
      const keys: string[] = []
      let continuationToken: string | undefined
      while (true) {
        const r: any = await client.listV2({ prefix, continuationToken, 'max-keys': 1000 })
        const arr = (r.objects || []).filter((o: any) => isAudio(o.name)).map((o: any) => o.name)
        keys.push(...arr)
        if (!r.isTruncated) break
        continuationToken = r.nextContinuationToken
      }
      devlog('provider:oss', 'list', { count: keys.length })
      return keys
    },
    async readFile(path: string) {
      ensure()
      try {
        const url = client.signatureUrl(path, { expires: 3600 })
        const res = await fetch(url)
        const blob = await res.blob()
        devlog('provider:oss', 'read', { path })
        return blob
      } catch (e) { devwarn('provider:oss', 'read failed', { path, err: String(e) }); throw e }
    }
  }
}
