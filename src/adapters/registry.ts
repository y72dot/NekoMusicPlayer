import type { AdapterHealth, AdapterRegistry, SourceAdapter } from '@/adapters/types'

export class Registry implements AdapterRegistry {
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
  async checkHealth(): Promise<Record<string, AdapterHealth>> {
    const entries = await Promise.all(this.list().map(async (adapter) => {
      try {
        return [adapter.id, await adapter.checkHealth()] as const
      } catch {
        return [adapter.id, {
          status: 'unavailable',
          authenticated: false,
          checkedAt: Date.now(),
          message: 'Health check failed',
        } satisfies AdapterHealth] as const
      }
    }))
    return Object.fromEntries(entries)
  }
}

export const registry: AdapterRegistry = new Registry()
