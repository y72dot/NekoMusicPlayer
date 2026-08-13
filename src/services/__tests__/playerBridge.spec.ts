import { describe, it, expect, vi, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'

const mockOn = vi.fn().mockReturnValue(() => {})
const mockSetVolume = vi.fn()

vi.mock('@/core/playerEngine', () => ({
  playerEngine: {
    on: (...args: any[]) => mockOn(...args),
    setVolume: (...args: any[]) => mockSetVolume(...args),
  },
}))

import { setupPlayerBridge } from '@/services/playerBridge'

describe('PlayerBridge', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  it('should register event listeners', () => {
    setupPlayerBridge()
    expect(mockOn).toHaveBeenCalledWith('timeupdate', expect.any(Function))
    expect(mockOn).toHaveBeenCalledWith('play', expect.any(Function))
    expect(mockOn).toHaveBeenCalledWith('pause', expect.any(Function))
    expect(mockOn).toHaveBeenCalledWith('ended', expect.any(Function))
    expect(mockOn).toHaveBeenCalledWith('error', expect.any(Function))
    expect(mockOn).toHaveBeenCalledWith('statuschange', expect.any(Function))
    expect(mockOn).toHaveBeenCalledWith('volumechange', expect.any(Function))
  })

  it('should set initial volume', () => {
    setupPlayerBridge()
    expect(mockSetVolume).toHaveBeenCalledWith(0.8)
  })
})
