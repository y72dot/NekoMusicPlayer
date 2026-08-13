import { describe, expect, it } from 'vitest'
import { Registry } from '@/adapters/registry'
import type { SourceAdapter } from '@/adapters/types'

const base = {
  name: 'Test',
  capabilities: { local: false, authentication: 'none', batchResolve: false, cacheable: false },
  canResolve: () => false,
  resolve: async () => [],
  loadByUri: async () => ({ url: 'https://example.com/audio' }),
} as const

describe('adapter registry health', () => {
  it('collects health without one failing adapter aborting the check', async () => {
    const registry = new Registry()
    registry.register({ ...base, id: 'ok', checkHealth: async () => ({ status: 'available', authenticated: true, checkedAt: 1 }) } as SourceAdapter)
    registry.register({ ...base, id: 'bad', checkHealth: async () => { throw new Error('secret backend detail') } } as SourceAdapter)

    await expect(registry.checkHealth()).resolves.toMatchObject({
      ok: { status: 'available' },
      bad: { status: 'unavailable', message: 'Health check failed' },
    })
  })
})
