import { describe, it, expect, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useSelectionStore } from '@/store/selection'

describe('SelectionStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('should start with empty selection', () => {
    const sel = useSelectionStore()
    expect(sel.count).toBe(0)
    expect(sel.isMultiSelectMode).toBe(false)
  })

  it('should toggle selection', () => {
    const sel = useSelectionStore()
    sel.toggleSelection('a')
    expect(sel.isSelected('a')).toBe(true)
    expect(sel.isMultiSelectMode).toBe(true)
    sel.toggleSelection('a')
    expect(sel.isSelected('a')).toBe(false)
    expect(sel.isMultiSelectMode).toBe(false)
  })

  it('should select and deselect', () => {
    const sel = useSelectionStore()
    sel.select('a')
    expect(sel.isSelected('a')).toBe(true)
    sel.deselect('a')
    expect(sel.isSelected('a')).toBe(false)
  })

  it('should clear all', () => {
    const sel = useSelectionStore()
    sel.select('a')
    sel.select('b')
    sel.clear()
    expect(sel.count).toBe(0)
    expect(sel.isMultiSelectMode).toBe(false)
  })

  it('should set multi-select mode', () => {
    const sel = useSelectionStore()
    sel.select('a')
    sel.setMultiSelectMode(true)
    expect(sel.isMultiSelectMode).toBe(true)
    sel.setMultiSelectMode(false)
    expect(sel.isMultiSelectMode).toBe(false)
    expect(sel.count).toBe(0)
  })
})
