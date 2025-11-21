type Method = 'log' | 'info' | 'warn' | 'error' | 'debug'

function isDev(): boolean {
  return Boolean((import.meta as any)?.env?.DEV)
}

function make(method: Method, ns: string) {
  const prefix = `[${ns}]`
  return (...args: unknown[]) => {
    if (!isDev()) return
    const fn = (console as any)[method] || console.log
    fn(prefix, ...args)
  }
}

export function createLogger(namespace: string) {
  return {
    log: make('log', namespace),
    info: make('info', namespace),
    warn: make('warn', namespace),
    error: make('error', namespace),
    debug: make('debug', namespace),
  }
}