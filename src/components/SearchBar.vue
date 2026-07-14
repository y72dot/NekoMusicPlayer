<template>
  <div class="search-bar">
    <span class="icon">🔍</span>
    <input
      v-model="model"
      type="text"
      placeholder="搜索歌曲、艺术家、专辑..."
      class="input"
      @keyup.escape="clear"
    />
    <button v-if="model" class="clear-btn" @click="clear">✕</button>
  </div>
</template>

<script setup lang="ts">
const model = defineModel<string>({ default: '' })

function clear() {
  model.value = ''
}
</script>

<style scoped>
.search-bar {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  background: #fafafa;
  border-bottom: 1px solid #eee;
}

.icon {
  color: #999;
  flex-shrink: 0;
}

.input {
  flex: 1;
  border: none;
  background: transparent;
  font-size: 14px;
  outline: none;
  padding: 4px 0;
}

.input::placeholder {
  color: #bbb;
}

.clear-btn {
  background: none;
  border: none;
  color: #999;
  cursor: pointer;
  padding: 2px 6px;
  font-size: 14px;
  border-radius: 50%;
}

.clear-btn:hover {
  background: #e0e0e0;
  color: #333;
}
</style>
