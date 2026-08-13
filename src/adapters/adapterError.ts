export type AdapterErrorCode =
  | 'AUTH_REQUIRED'
  | 'ACCESS_DENIED'
  | 'RATE_LIMITED'
  | 'TIMEOUT'
  | 'NOT_FOUND'
  | 'COPYRIGHT_RESTRICTED'
  | 'NO_AUDIO'
  | 'PROXY_UNAVAILABLE'
  | 'INVALID_INPUT'
  | 'UNKNOWN'

export class AdapterError extends Error {
  constructor(
    public readonly code: AdapterErrorCode,
    message: string,
    public readonly sourceId: string,
    public readonly retryable = false,
  ) {
    super(message)
    this.name = 'AdapterError'
  }
}

export function asAdapterError(error: unknown, sourceId: string): AdapterError {
  if (error instanceof AdapterError) return error
  const message = error instanceof Error ? error.message : String(error)
  if (/abort|timed out|timeout/i.test(message)) return new AdapterError('TIMEOUT', message, sourceId, true)
  if (/fetch|network|proxy/i.test(message)) return new AdapterError('PROXY_UNAVAILABLE', message, sourceId, true)
  return new AdapterError('UNKNOWN', message || 'Unknown adapter error', sourceId)
}
