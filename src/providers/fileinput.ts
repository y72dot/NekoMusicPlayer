import type { SourceProvider } from './types'

export function createFileInputProvider(files: FileList | File[]): SourceProvider {
  const id = 'fileinput'
  const map = new Map<string, File>()
  const arr = Array.from(files as any)
  for (const f of arr) {
    const p = (f as any).webkitRelativePath || f.name
    map.set(p, f)
  }
  return {
    id,
    type: 'custom',
    name: '文件选择',
    async connect() {},
    async listAudioFilesRecursively() { return Array.from(map.keys()) },
    async readFile(path: string) { return map.get(path) as File }
  }
}
