import { onMounted, onUnmounted } from 'vue'
import { usePlayerStore } from '@/store/player'
import { useSelectionStore } from '@/store/selection'

function isEditableTarget(el: EventTarget | null): boolean {
  if (!(el instanceof HTMLElement)) return false
  const tag = el.tagName
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || el.isContentEditable
}

export function useKeyboardShortcuts() {
  const player = usePlayerStore()
  const selection = useSelectionStore()

  function onKeyDown(e: KeyboardEvent) {
    if (isEditableTarget(e.target)) return

    const ctrl = e.ctrlKey || e.metaKey

    switch (e.key) {
      case ' ':
        e.preventDefault()
        player.toggle()
        break
      case 'ArrowLeft':
        if (ctrl) {
          e.preventDefault()
          player.prev()
        } else {
          e.preventDefault()
          player.seek(player.currentTime - 5)
        }
        break
      case 'ArrowRight':
        if (ctrl) {
          e.preventDefault()
          player.next()
        } else {
          e.preventDefault()
          player.seek(player.currentTime + 5)
        }
        break
      case 'ArrowUp':
        if (ctrl) {
          e.preventDefault()
          player.setVolume(player.volume + 0.05)
        }
        break
      case 'ArrowDown':
        if (ctrl) {
          e.preventDefault()
          player.setVolume(player.volume - 0.05)
        }
        break
      case 'Escape':
        if (selection.isMultiSelectMode) {
          selection.clear()
        }
        break
    }
  }

  onMounted(() => document.addEventListener('keydown', onKeyDown))
  onUnmounted(() => document.removeEventListener('keydown', onKeyDown))
}
