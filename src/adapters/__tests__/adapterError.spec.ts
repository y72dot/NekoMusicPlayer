import { describe, expect, it } from 'vitest'
import { AdapterError, asAdapterError } from '@/adapters/adapterError'

describe('adapter errors', () => {
  it('preserves structured adapter errors', () => {
    const error = new AdapterError('AUTH_REQUIRED', 'Login required', 'netease')
    expect(asAdapterError(error, 'bilibili')).toBe(error)
  })

  it.each([
    ['request timeout', 'TIMEOUT'],
    ['network fetch failed', 'PROXY_UNAVAILABLE'],
    ['unexpected response', 'UNKNOWN'],
  ] as const)('classifies %s', (message, code) => {
    expect(asAdapterError(new Error(message), 'test')).toMatchObject({ code, sourceId: 'test' })
  })
})
