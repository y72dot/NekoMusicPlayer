/**
 * Log levels ordered by severity
 */
export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
  NONE = 4,
}

const DEFAULT_LEVEL = import.meta.env.DEV ? LogLevel.DEBUG : LogLevel.ERROR

// Colors for console output
const COLORS: Record<number, string> = {
  [LogLevel.DEBUG]: 'color: #7f8c8d', // Gray
  [LogLevel.INFO]: 'color: #2980b9', // Blue
  [LogLevel.WARN]: 'color: #f39c12', // Orange
  [LogLevel.ERROR]: 'color: #c0392b', // Red
}

class LoggerManager {
  private level: LogLevel = DEFAULT_LEVEL

  constructor() {
    this.loadLevel()
  }

  /**
   * Load log level from localStorage if available
   */
  private loadLevel() {
    try {
      const stored = localStorage.getItem('neko:log_level')
      if (stored) {
        const parsed = parseInt(stored, 10)
        if (!isNaN(parsed) && parsed in LogLevel) {
          this.level = parsed as LogLevel
        }
      }
    } catch (e) {
      // ignore
    }
  }

  setLevel(level: LogLevel) {
    this.level = level
    try {
      localStorage.setItem('neko:log_level', level.toString())
    } catch (e) {
      // ignore
    }
  }

  getLevel() {
    return this.level
  }

  shouldLog(level: LogLevel) {
    return level >= this.level
  }
}

const manager = new LoggerManager()

class Logger {
  constructor(private namespace: string) {}

  private formatMessage(level: LogLevel, args: any[]) {
    const timestamp = new Date().toISOString().split('T')[1].slice(0, -1)
    const prefix = `%c[${timestamp}] [${this.namespace}]`
    return [prefix, COLORS[level], ...args]
  }

  debug(...args: any[]) {
    if (manager.shouldLog(LogLevel.DEBUG)) {
      console.debug(...this.formatMessage(LogLevel.DEBUG, args))
    }
  }

  info(...args: any[]) {
    if (manager.shouldLog(LogLevel.INFO)) {
      console.info(...this.formatMessage(LogLevel.INFO, args))
    }
  }

  warn(...args: any[]) {
    if (manager.shouldLog(LogLevel.WARN)) {
      console.warn(...this.formatMessage(LogLevel.WARN, args))
    }
  }

  error(...args: any[]) {
    if (manager.shouldLog(LogLevel.ERROR)) {
      console.error(...this.formatMessage(LogLevel.ERROR, args))
    }
  }
}

export function createLogger(namespace: string) {
  return new Logger(namespace)
}

export function setGlobalLogLevel(level: LogLevel) {
  manager.setLevel(level)
}

// For debugging in console
if (typeof window !== 'undefined') {
  (window as any).__setLogLevel = setGlobalLogLevel
  ;(window as any).__LogLevel = LogLevel
}
