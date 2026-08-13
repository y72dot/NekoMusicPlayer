<template>
  <Teleport to="body">
    <div class="toast-container" aria-live="polite" aria-atomic="false">
      <TransitionGroup name="toast">
        <div
          v-for="item in toast.items"
          :key="item.id"
          class="toast-item"
          :class="item.type"
          :role="item.type === 'error' ? 'alert' : 'status'"
          @click="toast.remove(item.id)"
        >
          <span class="icon">{{ icons[item.type] }}</span>
          <span class="message">{{ item.message }}</span>
        </div>
      </TransitionGroup>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { useToastStore } from '@/store/toast'

const toast = useToastStore()

const icons: Record<string, string> = {
  success: '✓',
  error: '✕',
  warning: '⚠',
  info: 'ℹ',
}
</script>

<style scoped>
.toast-container {
  position: fixed;
  top: 16px;
  right: 16px;
  z-index: 9999;
  display: flex;
  flex-direction: column;
  gap: 8px;
  pointer-events: none;
}

.toast-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 16px;
  border-radius: 6px;
  font-size: 14px;
  min-width: 200px;
  max-width: 360px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  cursor: pointer;
  pointer-events: auto;
  transition: all 0.3s ease;
}

.toast-item.success {
  background: #f6ffed;
  border: 1px solid #b7eb8f;
  color: #389e0d;
}

.toast-item.error {
  background: #fff2f0;
  border: 1px solid #ffccc7;
  color: #cf1322;
}

.toast-item.warning {
  background: #fffbe6;
  border: 1px solid #ffe58f;
  color: #d48806;
}

.toast-item.info {
  background: #e6f7ff;
  border: 1px solid #91d5ff;
  color: #096dd9;
}

.icon {
  flex-shrink: 0;
  font-weight: bold;
  font-size: 16px;
}

.message {
  word-break: break-word;
}

/* TransitionGroup animations */
.toast-enter-active {
  transition: all 0.3s ease;
}

.toast-leave-active {
  transition: all 0.3s ease;
}

.toast-enter-from {
  opacity: 0;
  transform: translateX(40px);
}

.toast-leave-to {
  opacity: 0;
  transform: translateX(40px);
}
</style>
