export type DevLogger = (module: string, message: string, data?: any) => void

function out(level: 'log'|'warn'|'error', module: string, message: string, data?: any) {
  if (!(import.meta as any).env?.DEV) return
  const prefix = `[${module}] ${message}`
  try {
    if (data !== undefined) (console as any)[level](prefix, data)
    else (console as any)[level](prefix)
  } catch {}
}

export const devlog: DevLogger = (m, msg, d) => out('log', m, msg, d)
export const devwarn: DevLogger = (m, msg, d) => out('warn', m, msg, d)
export const deverror: DevLogger = (m, msg, d) => out('error', m, msg, d)
