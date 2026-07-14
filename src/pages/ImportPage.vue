<template>
  <div class="page-content">
    <h2>导入音乐</h2>
    <ImportPanel />
  </div>
</template>
<script setup lang="ts">
import ImportPanel from '@/components/ImportPanel.vue'
</script>
<style scoped>
.page-content { padding: 24px; max-width: 800px; margin: 0 auto; }
h2 { margin-bottom: 24px; border-bottom: 1px solid #eee; padding-bottom: 12px; }
</style>
