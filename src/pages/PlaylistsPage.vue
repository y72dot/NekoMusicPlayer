<template>
  <div class="page">
    <SidebarPlaylists />
    <main class="main">
      <h2>歌单管理</h2>
      <p>在左侧新建、重命名或删除歌单。</p>
    </main>
  </div>
</template>
<script setup lang="ts">
import SidebarPlaylists from '../components/SidebarPlaylists.vue'
</script>
<style scoped>
.page { display:flex; height:100vh }
.main { flex:1; padding:16px }
</style>