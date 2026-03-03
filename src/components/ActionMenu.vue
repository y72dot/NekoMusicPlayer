<template>
  <div class="action-menu" :class="{ expanded }" @mouseleave="expanded = false">
    <div class="actions-wrapper">
      <button class="action-btn" title="立即播放" @click.stop="$emit('play')">▶️</button>
      <button class="action-btn" title="加入队列" @click.stop="$emit('addToQueue')">➕</button>
      
      <!-- Hidden buttons container -->
      <div class="hidden-wrapper">
        <button class="action-btn" title="添加到歌单" @click.stop="handleClick('addToPlaylist')">📥</button>
        <button class="action-btn danger" title="删除" @click.stop="handleClick('remove')">🗑️</button>
      </div>

      <button class="action-btn more-btn" title="更多" @click.stop="toggle">⋯</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'

const emit = defineEmits<{
  (e: 'play'): void
  (e: 'addToQueue'): void
  (e: 'addToPlaylist'): void
  (e: 'remove'): void
}>()

const expanded = ref(false)

function toggle() {
  expanded.value = !expanded.value
}

function handleClick(event: 'addToPlaylist' | 'remove') {
  emit(event)
  expanded.value = false
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
  width: 150px; 
  background: #f0f0f0;
}

.actions-wrapper {
  display: flex;
  align-items: center;
  position: absolute;
  right: 0;
}

.hidden-wrapper {
  display: flex;
  width: 0;
  overflow: hidden;
  opacity: 0;
  transition: width 0.3s ease, opacity 0.2s ease;
}

.action-menu.expanded .hidden-wrapper {
  width: 60px; /* 2 buttons * 30px */
  opacity: 1;
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

.more-btn {
  transition: transform 0.3s;
  z-index: 10; /* Ensure more button stays on top if needed */
}

.action-menu.expanded .more-btn {
  transform: rotate(90deg);
  background: #e0e0e0;
}
</style>
