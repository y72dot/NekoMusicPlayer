import { registry } from './registry'
import { externalLinkAdapter } from './externalLinkAdapter'
import { fileSystemAdapter } from './fileSystemAdapter'

export function registerAdapters() {
  registry.register(externalLinkAdapter)
  registry.register(fileSystemAdapter)
}