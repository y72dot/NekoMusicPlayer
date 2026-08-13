import { describe, expect, it } from 'vitest'
import { normalizePlaybackError, PlaybackError } from '@/core/playbackError'

describe('playback error classification', () => {
  it('keeps existing structured errors intact', () => {
    const error = new PlaybackError('AUTH_REQUIRED', 'resolve', 'auth', false)
    expect(normalizePlaybackError(error, 'play')).toBe(error)
  })

  it('classifies retryable network and timeout failures', () => {
    expect(normalizePlaybackError(new TypeError('Failed to fetch'), 'resolve')).toMatchObject({
      code: 'NETWORK', retryable: true, stage: 'resolve',
    })
    expect(normalizePlaybackError(new DOMException('aborted', 'AbortError'), 'resolve')).toMatchObject({
      code: 'TIMEOUT', retryable: true,
    })
  })

  it('does not retry authentication and access failures blindly', () => {
    expect(normalizePlaybackError(new Error('Cookie expired'), 'resolve')).toMatchObject({
      code: 'AUTH_REQUIRED', retryable: false,
    })
    expect(normalizePlaybackError(new Error('Access denied'), 'resolve')).toMatchObject({
      code: 'ACCESS_DENIED', retryable: false,
    })
  })
})
