import { beforeEach, describe, expect, it, vi } from 'vitest'
import { clearRecentLogs, createLogger } from '@/services/logger'

vi.mock('@/services/audioCache', () => ({
  audioCache: {
    getStats: vi.fn(async () => ({ count: 2, size: 1024 })),
    getStatsBySource: vi.fn(async () => ({ netease: { count: 2, size: 1024 } })),
  },
}))
vi.mock('@/adapters/registry', () => ({
  registry: { checkHealth: vi.fn(async () => ({ fs: { status: 'available', authenticated: true, checkedAt: 1 } })) },
}))
vi.mock('@/core/playerEngine', () => ({
  playerEngine: { status: 'paused', currentTrack: { sourceId: 'netease', title: 'Private song name' } },
}))

describe('diagnostic report', () => {
  beforeEach(() => clearRecentLogs())

  it('contains useful state without track details or secrets', async () => {
    createLogger('Test').error('failed', { token: 'secret-token', url: 'https://example.com/audio?signature=private' })
    const { createDiagnosticReport } = await import('@/services/diagnostics')
    const report = await createDiagnosticReport()
    const serialized = JSON.stringify(report)

    expect(report).toMatchObject({ schemaVersion: 1, playback: { status: 'paused', sourceId: 'netease', hasCurrentTrack: true } })
    expect(report.storage.cache).toEqual({ count: 2, size: 1024 })
    expect(serialized).not.toContain('secret-token')
    expect(serialized).not.toContain('signature=private')
    expect(serialized).not.toContain('Private song name')
  })
})
