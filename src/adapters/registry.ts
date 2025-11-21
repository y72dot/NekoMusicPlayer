import type { AdapterRegistry, SourceAdapter } from './types'

class Registry implements AdapterRegistry {
  private map = new Map<string, SourceAdapter>()
  register(adapter: SourceAdapter) {
    this.map.set(adapter.id, adapter)
  }
  list() { return Array.from(this.map.values()) }
  get(id: string) { return this.map.get(id) }
  findByInput(input: unknown) {
    for (const a of this.map.values()) {
      try { if (a.canResolve(input)) return a } catch {}
    }
    return undefined
  }
}

export const registry: AdapterRegistry = new Registry()