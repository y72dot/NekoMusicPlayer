import { defineStore } from 'pinia'

export type ToastType = 'success' | 'error' | 'warning' | 'info'

export interface Toast {
  id: string
  message: string
  type: ToastType
  duration: number
}

export const useToastStore = defineStore('toast', {
  state: () => ({
    items: [] as Toast[],
  }),
  actions: {
    add(message: string, type: ToastType = 'info', duration?: number) {
      const defaults: Record<ToastType, number> = {
        success: 3000,
        error: 5000,
        warning: 4000,
        info: 3000,
      }
      const id = crypto.randomUUID()
      const toast: Toast = {
        id,
        message,
        type,
        duration: duration ?? defaults[type],
      }
      this.items.push(toast)
      if (toast.duration > 0) {
        setTimeout(() => this.remove(id), toast.duration)
      }
    },
    success(message: string) {
      this.add(message, 'success')
    },
    error(message: string) {
      this.add(message, 'error')
    },
    warning(message: string) {
      this.add(message, 'warning')
    },
    info(message: string) {
      this.add(message, 'info')
    },
    remove(id: string) {
      this.items = this.items.filter(t => t.id !== id)
    },
  },
})
