import { defineStore } from 'pinia'
import type { Track } from '../models/track'

export const useSelectionStore = defineStore('selection', {
  state: () => ({
    selectedIds: new Set<string>(),
    isMultiSelectMode: false,
  }),
  getters: {
    count(state) {
      return state.selectedIds.size
    },
    isSelected: (state) => (id: string) => state.selectedIds.has(id),
  },
  actions: {
    toggleSelection(id: string) {
      if (this.selectedIds.has(id)) {
        this.selectedIds.delete(id)
        // If no items selected, maybe exit multi-select mode? 
        // For now, keep mode active until explicit exit or clicking outside logic (handled by UI)
        if (this.selectedIds.size === 0) {
          this.isMultiSelectMode = false
        }
      } else {
        this.selectedIds.add(id)
        this.isMultiSelectMode = true
      }
    },
    select(id: string) {
      this.selectedIds.add(id)
      this.isMultiSelectMode = true
    },
    deselect(id: string) {
      this.selectedIds.delete(id)
      if (this.selectedIds.size === 0) {
        this.isMultiSelectMode = false
      }
    },
    clear() {
      this.selectedIds.clear()
      this.isMultiSelectMode = false
    },
    setMultiSelectMode(active: boolean) {
      this.isMultiSelectMode = active
      if (!active) {
        this.selectedIds.clear()
      }
    }
  }
})
