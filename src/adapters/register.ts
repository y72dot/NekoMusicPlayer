import { registry } from '@/adapters/registry'
import { neteaseAdapter } from '@/adapters/neteaseAdapter'
import { bilibiliAdapter } from '@/adapters/bilibiliAdapter'
import { externalLinkAdapter } from '@/adapters/externalLinkAdapter'
import { fileSystemAdapter } from '@/adapters/fileSystemAdapter'

export function registerAdapters() {
  registry.register(neteaseAdapter)
  registry.register(bilibiliAdapter)
  registry.register(externalLinkAdapter)
  registry.register(fileSystemAdapter)
}