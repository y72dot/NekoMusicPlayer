<template>
  <div class="batch-action-bar">
    <div class="status">
      <span class="count">{{ $t('batch.selected', { count }) }}</span>
      <button class="text-btn" @click="$emit('selectAll')">{{ $t('actions.selectAll') }}</button>
      <button class="text-btn" @click="$emit('invertSelection')">{{ $t('actions.invertSelection') }}</button>
      <span class="divider">|</span>
      <button class="cancel-btn" @click="$emit('cancel')">{{ $t('batch.cancelSelection') }}</button>
    </div>
    <div class="actions">
      <button class="action-btn" :title="$t('actions.play')" @click="$emit('play')">▶️ {{ $t('actions.play') }}</button>
      <button class="action-btn" :title="$t('actions.addToQueue')" @click="$emit('addToQueue')">➕ {{ $t('actions.addToQueue') }}</button>
      <button class="action-btn" :title="$t('actions.addToPlaylist')" @click="$emit('addToPlaylist')">📥 {{ $t('actions.addToPlaylist') }}</button>
      <button class="action-btn danger" :title="$t('actions.remove')" @click="$emit('remove')">🗑️ {{ $t('actions.remove') }}</button>
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps<{ count: number }>()
defineEmits<{
  (e: 'play'): void
  (e: 'addToQueue'): void
  (e: 'addToPlaylist'): void
  (e: 'remove'): void
  (e: 'cancel'): void
  (e: 'selectAll'): void
  (e: 'invertSelection'): void
}>()
</script>

<style scoped>
.batch-action-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 16px; /* Reduced vertical padding */
  background: #e6f7ff;
  border-bottom: 1px solid #1890ff;
  width: 100%;
  height: 100%;
  box-sizing: border-box;
}

.status {
  display: flex;
  align-items: center;
  gap: 12px;
}

.count {
  font-weight: 600;
  color: #1890ff;
  margin-right: 8px;
}

.divider {
  color: #a6d4ff;
  margin: 0 4px;
}

.text-btn {
  border: none;
  background: transparent;
  color: #1890ff;
  padding: 4px 8px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 13px;
  font-weight: 500;
}

.text-btn:hover {
  background: rgba(24, 144, 255, 0.1);
}

.cancel-btn {
  border: 1px solid #1890ff;
  background: transparent;
  color: #1890ff;
  padding: 4px 12px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 13px;
}

.cancel-btn:hover {
  background: #e6f7ff;
}

.actions {
  display: flex;
  gap: 8px;
}

.action-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  border: none;
  background: #fff;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  color: #333;
  transition: all 0.2s;
  box-shadow: 0 1px 2px rgba(0,0,0,0.05);
}

.action-btn:hover {
  background: #fafafa;
  transform: translateY(-1px);
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

.action-btn.danger {
  color: #ff4d4f;
  background: #fff1f0;
}

.action-btn.danger:hover {
  background: #ffccc7;
}
</style>