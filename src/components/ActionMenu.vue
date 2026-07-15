<template>
  <div class="action-menu" :class="{ expanded: isExpanded }" @mouseleave="onMouseLeave">
    <div class="actions-wrapper">
      <button class="action-btn" title="立即播放" @click.stop="handleAction('play')">▶️</button>
      <button class="action-btn" title="加入队列" @click.stop="handleAction('addToQueue')">➕</button>
      
      <!-- Hidden buttons container -->
      <div class="hidden-wrapper">
        <button class="action-btn" title="详情" @click.stop="handleAction('details')">🔍</button>
        <button class="action-btn" title="添加到歌单" @click.stop="handleAction('addToPlaylist')">📥</button>
        <button class="action-btn danger" title="删除" @click.stop="handleAction('remove')">🗑️</button>
      </div>
      
      <button class="action-btn toggle-select-btn" 
        :class="{ active: isSelected }"
        title="多选模式" 
        @click.stop="toggleSelect">
        {{ isSelected ? '☑️' : '☐' }}
      </button>

      <button class="action-btn more-btn" title="更多" @click.stop="toggle">⋯</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useSelectionStore } from '@/store/selection'

const props = defineProps<{ trackId: string }>()

const emit = defineEmits<{
  (e: 'play'): void
  (e: 'addToQueue'): void
  (e: 'addToPlaylist'): void
  (e: 'remove'): void
  (e: 'details'): void
}>()

const selection = useSelectionStore()
const localExpanded = ref(false)

const isSelected = computed(() => selection.selectedIds.has(props.trackId))

// Menu is expanded if locally expanded OR if this item is selected in multi-select mode
const isExpanded = computed(() => {
  if (selection.isMultiSelectMode && isSelected.value) {
    return true
  }
  return localExpanded.value
})

watch(() => selection.isMultiSelectMode, (newVal) => {
  if (!newVal) {
    localExpanded.value = false
  }
})

function toggle() {
  localExpanded.value = !localExpanded.value
}

function onMouseLeave() {
  // Only auto-close if not selected in multi-select mode
  if (!isSelected.value) {
    localExpanded.value = false
  }
}

function toggleSelect() {
  // If not in multi-select mode, entering it with this item
  if (!selection.isMultiSelectMode) {
    selection.setMultiSelectMode(true)
    selection.select(props.trackId)
    // No longer forcing localExpanded here, relying on isExpanded computed
  } else {
    // Toggle selection for this item
    selection.toggleSelection(props.trackId)
  }
}

function handleAction(event: 'play' | 'addToQueue' | 'addToPlaylist' | 'remove' | 'details') {
  // If in multi-select mode and this item is selected,
  // the parent component should handle the action for ALL selected items.
  // We just emit the event, and parent checks selection store.
  ;(emit as any)(event)
  if (!isSelected.value) {
    localExpanded.value = false
  }
}
</script>

<style scoped>
.action-menu {
  position: relative;
  display: flex;
  justify-content: flex-end;
  align-items: center;
  height: 24px;
  width: 90px; 
  background: transparent;
  border-radius: 12px;
  transition: width 0.3s ease, background 0.3s ease;
  overflow: hidden;
}

.action-menu.expanded {
  width: 210px;
  background: #f0f0f0;
}

.actions-wrapper {
  display: flex;
  align-items: center;
  position: absolute;
  right: 0;
}

.action-btn {
  width: 30px;
  height: 24px;
  border: none;
  background: transparent;
  cursor: pointer;
  display: flex;
  justify-content: center;
  align-items: center;
  font-size: 14px;
  padding: 0;
  color: #555;
  transition: color 0.2s, background 0.2s;
  flex-shrink: 0; /* Prevent shrinking */
}

.action-btn:hover {
  background: #e0e0e0;
  color: #000;
}

.action-btn.danger:hover {
  color: #ff4d4f;
  background: #fff1f0;
}

.hidden-wrapper {
  display: flex;
  width: 0;
  overflow: hidden;
  opacity: 0;
  transition: width 0.3s ease, opacity 0.2s ease;
}

.action-menu.expanded .hidden-wrapper {
  width: 90px; /* 3 buttons * 30px */
  opacity: 1;
}

.toggle-select-btn {
  opacity: 0;
  width: 0;
  overflow: hidden;
  transition: width 0.3s ease, opacity 0.2s ease;
}

.action-menu.expanded .toggle-select-btn {
  width: 30px;
  opacity: 1;
}

.toggle-select-btn.active {
  color: #1890ff;
}

.more-btn {
  transition: transform 0.3s;
  z-index: 10; /* Ensure more button stays on top if needed */
}

.action-menu.expanded .more-btn {
  transform: rotate(90deg);
  background: #e0e0e0;
}
</style>
