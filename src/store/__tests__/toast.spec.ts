import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useToastStore } from '@/store/toast'

describe('ToastStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.useFakeTimers()
  })

  it('should add a toast', () => {
    const toast = useToastStore()
    toast.add('test', 'info')
    expect(toast.items).toHaveLength(1)
    expect(toast.items[0].message).toBe('test')
    expect(toast.items[0].type).toBe('info')
  })

  it('should auto-remove toast after duration', () => {
    const toast = useToastStore()
    toast.add('test', 'success', 1000)
    expect(toast.items).toHaveLength(1)
    vi.advanceTimersByTime(1000)
    expect(toast.items).toHaveLength(0)
  })

  it('success/error/warning/info shortcuts', () => {
    const toast = useToastStore()
    toast.success('ok')
    toast.error('err')
    toast.warning('warn')
    toast.info('info')
    expect(toast.items).toHaveLength(4)
    expect(toast.items.map(t => t.type)).toEqual(['success', 'error', 'warning', 'info'])
  })

  it('should remove toast by id', () => {
    const toast = useToastStore()
    toast.add('test', 'info')
    const id = toast.items[0].id
    toast.remove(id)
    expect(toast.items).toHaveLength(0)
  })
})
