import { audioCache } from '@/services/audioCache'
import { createLogger, getRecentLogs } from '@/services/logger'
import { registry } from '@/adapters/registry'
import { playerEngine } from '@/core/playerEngine'

const logger = createLogger('Global')
let captureInstalled = false

export function setupGlobalErrorCapture() {
  if (captureInstalled || typeof window === 'undefined') return
  captureInstalled = true
  window.addEventListener('error', event => {
    logger.error('uncaught-error', { name: event.error?.name || 'Error', message: event.message })
  })
  window.addEventListener('unhandledrejection', event => {
    const reason = event.reason instanceof Error ? event.reason : new Error(String(event.reason))
    logger.error('unhandled-rejection', reason)
  })
}

export interface DiagnosticReport {
  schemaVersion: 1
  generatedAt: string
  app: { name: string; version: string }
  browser: { userAgent: string; language: string; online: boolean }
  pwa: { serviceWorkerSupported: boolean; controlled: boolean }
  storage: { usage: number; quota: number; cache: { count: number; size: number }; cacheBySource: Record<string, { count: number; size: number }> }
  adapters: Awaited<ReturnType<typeof registry.checkHealth>>
  playback: { status: string; sourceId?: string; hasCurrentTrack: boolean }
  logs: ReturnType<typeof getRecentLogs>
}

export async function createDiagnosticReport(): Promise<DiagnosticReport> {
  const [estimate, cache, cacheBySource, adapters] = await Promise.all([
    navigator.storage?.estimate?.().catch(() => undefined),
    audioCache.getStats().catch(() => ({ count: 0, size: 0 })),
    audioCache.getStatsBySource().catch(() => ({})),
    registry.checkHealth(),
  ])
  return {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    app: { name: 'Neko Music Player', version: __APP_VERSION__ },
    browser: { userAgent: navigator.userAgent, language: navigator.language, online: navigator.onLine },
    pwa: { serviceWorkerSupported: 'serviceWorker' in navigator, controlled: Boolean(navigator.serviceWorker?.controller) },
    storage: { usage: estimate?.usage || 0, quota: estimate?.quota || 0, cache, cacheBySource },
    adapters,
    playback: {
      status: playerEngine.status,
      sourceId: playerEngine.currentTrack?.sourceId,
      hasCurrentTrack: Boolean(playerEngine.currentTrack),
    },
    logs: getRecentLogs(),
  }
}

export async function downloadDiagnosticReport() {
  const report = await createDiagnosticReport()
  const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = `neko-diagnostics-${report.generatedAt.replace(/[:.]/g, '-')}.json`
  anchor.click()
  URL.revokeObjectURL(url)
}
