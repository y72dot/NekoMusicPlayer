export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
  NONE = 4,
}

export interface DiagnosticLogEntry {
  timestamp: string
  level: 'debug' | 'info' | 'warn' | 'error'
  namespace: string
  args: unknown[]
}

const DEFAULT_LEVEL = import.meta.env.DEV ? LogLevel.DEBUG : LogLevel.ERROR
const MAX_LOG_ENTRIES = 200
const REDACTED = '[redacted]'
const SENSITIVE_KEY = /cookie|token|authorization|password|secret|csrf|sessdata|buvid|credential|signature/i
const SENSITIVE_VALUE = /(MUSIC_U|SESSDATA|bili_jct|__csrf|authorization|X-Neko-Upstream-Cookie)\s*[=:]\s*[^;\s&]+/gi
const COLORS: Record<number, string> = {
  [LogLevel.DEBUG]: 'color: #7f8c8d',
  [LogLevel.INFO]: 'color: #2980b9',
  [LogLevel.WARN]: 'color: #f39c12',
  [LogLevel.ERROR]: 'color: #c0392b',
}
const LEVEL_NAMES = ['debug', 'info', 'warn', 'error'] as const
const recentLogs: DiagnosticLogEntry[] = []

function levelName(level: LogLevel): DiagnosticLogEntry['level'] {
  return level === LogLevel.DEBUG ? 'debug' : level === LogLevel.INFO ? 'info' : level === LogLevel.WARN ? 'warn' : 'error'
}

function sanitizeString(value: string): string {
  let scrubbed = value.replace(/blob:https?:\/\/[^\s"'<>]+/gi, '[blob-url]')
  scrubbed = scrubbed.replace(SENSITIVE_VALUE, '$1=' + REDACTED)
  scrubbed = scrubbed.replace(/https?:\/\/[^\s"'<>]+/gi, raw => {
    try {
      const url = new URL(raw)
      return `${url.origin}${url.pathname}`
    } catch { return raw }
  })
  try {
    const url = new URL(scrubbed)
    if (url.protocol === 'http:' || url.protocol === 'https:') return `${url.origin}${url.pathname}`
  } catch {}
  return scrubbed
}

export function sanitizeDiagnosticValue(value: unknown, seen = new WeakSet<object>()): unknown {
  if (typeof value === 'string') return sanitizeString(value)
  if (value == null || typeof value === 'number' || typeof value === 'boolean') return value
  if (value instanceof Error) return { name: value.name, message: sanitizeString(value.message) }
  if (typeof value !== 'object') return String(value)
  if (seen.has(value)) return '[circular]'
  seen.add(value)
  if (Array.isArray(value)) return value.map(item => sanitizeDiagnosticValue(item, seen))
  return Object.fromEntries(Object.entries(value as Record<string, unknown>).map(([key, item]) => [
    key,
    SENSITIVE_KEY.test(key) ? REDACTED : sanitizeDiagnosticValue(item, seen),
  ]))
}

class LoggerManager {
  private level: LogLevel = DEFAULT_LEVEL
  constructor() { this.loadLevel() }
  private loadLevel() {
    try {
      const parsed = Number(localStorage.getItem('neko:log_level'))
      if (Number.isInteger(parsed) && parsed >= LogLevel.DEBUG && parsed <= LogLevel.NONE) this.level = parsed
    } catch {}
  }
  setLevel(level: LogLevel) {
    this.level = level
    try { localStorage.setItem('neko:log_level', level.toString()) } catch {}
  }
  getLevel() { return this.level }
  shouldLog(level: LogLevel) { return level >= this.level }
}

const manager = new LoggerManager()

function record(level: LogLevel, namespace: string, args: unknown[]) {
  recentLogs.push({
    timestamp: new Date().toISOString(),
    level: levelName(level),
    namespace,
    args: sanitizeDiagnosticValue(args) as unknown[],
  })
  if (recentLogs.length > MAX_LOG_ENTRIES) recentLogs.splice(0, recentLogs.length - MAX_LOG_ENTRIES)
}

class Logger {
  constructor(private namespace: string) {}
  private write(level: LogLevel, args: unknown[]) {
    const sanitized = sanitizeDiagnosticValue(args) as unknown[]
    record(level, this.namespace, sanitized)
    if (!manager.shouldLog(level)) return
    const timestamp = new Date().toISOString().split('T')[1].slice(0, -1)
    const output = [`%c[${timestamp}] [${this.namespace}]`, COLORS[level], ...sanitized]
    const method = levelName(level)
    console[method](...output)
  }
  debug(...args: unknown[]) { this.write(LogLevel.DEBUG, args) }
  info(...args: unknown[]) { this.write(LogLevel.INFO, args) }
  warn(...args: unknown[]) { this.write(LogLevel.WARN, args) }
  error(...args: unknown[]) { this.write(LogLevel.ERROR, args) }
}

export function createLogger(namespace: string) { return new Logger(namespace) }
export function setGlobalLogLevel(level: LogLevel) { manager.setLevel(level) }
export function getRecentLogs(): DiagnosticLogEntry[] { return structuredClone(recentLogs) }
export function clearRecentLogs() { recentLogs.length = 0 }

if (typeof window !== 'undefined') {
  ;(window as any).__setLogLevel = setGlobalLogLevel
  ;(window as any).__LogLevel = LogLevel
}
