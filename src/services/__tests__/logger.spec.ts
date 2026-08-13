import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { clearRecentLogs, createLogger, getRecentLogs, sanitizeDiagnosticValue, setGlobalLogLevel, LogLevel } from '@/services/logger'

describe('Logger', () => {
  beforeEach(() => {
    clearRecentLogs()
    vi.spyOn(console, 'debug').mockImplementation(() => {})
    vi.spyOn(console, 'info').mockImplementation(() => {})
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('should create logger with namespace', () => {
    const log = createLogger('Test')
    log.info('hello')
    expect(console.info).toHaveBeenCalled()
    const args = (console.info as any).mock.calls[0]
    expect(args.some((a: string) => a.includes('Test'))).toBe(true)
  })

  it('should log at different levels', () => {
    const log = createLogger('Test')
    log.debug('debug msg')
    log.info('info msg')
    log.warn('warn msg')
    log.error('error msg')
    expect(console.debug).toHaveBeenCalled()
    expect(console.info).toHaveBeenCalled()
    expect(console.warn).toHaveBeenCalled()
    expect(console.error).toHaveBeenCalled()
  })

  it('should respect log level', () => {
    setGlobalLogLevel(LogLevel.ERROR)
    const log = createLogger('Test')
    log.info('should not appear')
    log.error('should appear')
    expect(console.info).not.toHaveBeenCalled()
    expect(console.error).toHaveBeenCalled()
    setGlobalLogLevel(LogLevel.DEBUG) // reset
  })

  it('redacts credentials and URL query parameters from console and buffered logs', () => {
    const log = createLogger('Privacy')
    log.error('https://example.com/audio?id=42&token=secret', {
      cookie: 'MUSIC_U=secret',
      nested: { authorization: 'Bearer secret', safe: 'ok' },
      media: 'blob:https://example.com/secret-id',
    })

    const serialized = JSON.stringify(getRecentLogs())
    expect(serialized).not.toContain('secret')
    expect(serialized).not.toContain('?id=42')
    expect(serialized).not.toContain('secret-id')
    expect(serialized).toContain('[redacted]')
    expect(serialized).toContain('[blob-url]')
    expect(JSON.stringify((console.error as any).mock.calls)).not.toContain('secret')
    expect(sanitizeDiagnosticValue('failed at https://example.com/audio?id=42&quality=high')).toBe('failed at https://example.com/audio')
  })

  it('keeps only the most recent 200 records', () => {
    const log = createLogger('Bounded')
    for (let i = 0; i < 205; i++) log.info('entry', i)
    expect(getRecentLogs()).toHaveLength(200)
    expect(getRecentLogs()[0].args).toContain(5)
  })

  it('handles circular diagnostic values', () => {
    const value: Record<string, unknown> = { safe: true }
    value.self = value
    expect(sanitizeDiagnosticValue(value)).toEqual({ safe: true, self: '[circular]' })
  })
})
