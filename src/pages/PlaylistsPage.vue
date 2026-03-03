<template>
  <div class="page-content">
    <h2>歌单管理</h2>
    <div class="guide">
      <p>请在左侧边栏进行歌单的新建、切换、重命名和删除操作。</p>
      <p>当前选中的歌单: <strong>{{ playlists.current?.name || '无' }}</strong></p>
    </div>
  </div>
</template>
<script setup lang="ts">
import { usePlaylistsStore } from '../store/playlists'
const playlists = usePlaylistsStore()
</script>
<style scoped>
.page-content { padding: 24px; max-width: 800px; margin: 0 auto; }
.guide { background: #f9f9f9; padding: 20px; border-radius: 8px; border: 1px solid #eee; }
h2 { margin-bottom: 24px; border-bottom: 1px solid #eee; padding-bottom: 12px; }
</style>
