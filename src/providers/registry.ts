import type { SourceProvider } from './types'

const map = new Map<string, SourceProvider>()

export function registerProvider(p: SourceProvider) { map.set(p.id, p) }
export function getProvider(id: string) { return map.get(id) }

