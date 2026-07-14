import { registry } from '@/adapters/registry'
import { externalLinkAdapter } from '@/adapters/externalLinkAdapter'
import { fileSystemAdapter } from '@/adapters/fileSystemAdapter'

export function registerAdapters() {
  registry.register(externalLinkAdapter)
  registry.register(fileSystemAdapter)
}