import type { SourceProvider } from './types'

export function createCustomProvider(baseUrl: string): SourceProvider {
  const id = `custom:${baseUrl}`
  return {
    id,
    type: 'custom',
    name: '自定义API',
    async connect() {},
    async listAudioFilesRecursively(root: string) {
      const res = await fetch(`${baseUrl.replace(/\/$/, '')}/tracks`)
      if (!res.ok) throw new Error('加载失败')
      const data: { path: string }[] = await res.json()
      return data.map(d => d.path)
    },
    async readFile(path: string) {
      const res = await fetch(path)
      const blob = await res.blob()
      return blob
    }
  }
}
