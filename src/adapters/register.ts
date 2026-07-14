import { registry } from '@/adapters/registry'
import { neteaseAdapter } from '@/adapters/neteaseAdapter'
import { externalLinkAdapter } from '@/adapters/externalLinkAdapter'
import { fileSystemAdapter } from '@/adapters/fileSystemAdapter'

export function registerAdapters() {
  registry.register(neteaseAdapter)
  registry.register(externalLinkAdapter)
  registry.register(fileSystemAdapter)
}