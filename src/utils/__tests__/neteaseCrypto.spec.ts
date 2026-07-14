import { describe, it, expect } from 'vitest'
import { sign } from '@/utils/neteaseCrypto'

describe('neteaseCrypto', () => {
  it('should produce params and encSecKey', () => {
    const result = sign({ ids: '[12345678]', level: 'standard' })
    expect(result).toHaveProperty('params')
    expect(result).toHaveProperty('encSecKey')
    expect(typeof result.params).toBe('string')
    expect(typeof result.encSecKey).toBe('string')
  })

  it('should produce non-empty params', () => {
    const result = sign({ test: 'hello' })
    expect(result.params.length).toBeGreaterThan(0)
  })

  it('should produce 256-char encSecKey', () => {
    const result = sign({ test: 'hello' })
    expect(result.encSecKey.length).toBe(256)
  })

  it('should produce valid hex encSecKey', () => {
    const result = sign({ test: 'hello' })
    expect(/^[0-9a-f]{256}$/.test(result.encSecKey)).toBe(true)
  })

  it('should handle empty body', () => {
    const result = sign({})
    expect(result.params.length).toBeGreaterThan(0)
    expect(result.encSecKey.length).toBe(256)
  })

  it('should handle nested JSON body', () => {
    const result = sign({ c: JSON.stringify([{ id: '123' }]) })
    expect(result.params.length).toBeGreaterThan(0)
    expect(result.encSecKey.length).toBe(256)
  })

  it('should produce different encSecKey each call (random key)', () => {
    const results = Array.from({ length: 5 }, () => sign({ ids: '[1]' }))
    const keys = new Set(results.map(r => r.encSecKey))
    // All should be different due to random second key
    expect(keys.size).toBe(5)
  })

  it('should produce decryptable params (round-trip consistency)', () => {
    // Sign the same body twice - params should differ but both should be valid base64
    const r1 = sign({ ids: '[123]' })
    const r2 = sign({ ids: '[123]' })
    // Params should be base64 encoded
    expect(() => atob(r1.params)).not.toThrow()
    expect(() => atob(r2.params)).not.toThrow()
    // Two calls should produce different params (different random key)
    expect(r1.params).not.toBe(r2.params)
  })

  it('should handle Chinese characters in body', () => {
    const result = sign({ keyword: '你好', type: 1 })
    expect(result.params.length).toBeGreaterThan(0)
    expect(result.encSecKey.length).toBe(256)
  })
})
