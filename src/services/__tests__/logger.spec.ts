import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createLogger, setGlobalLogLevel, LogLevel } from '@/services/logger'

describe('Logger', () => {
  beforeEach(() => {
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
})
