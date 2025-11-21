<template>
  <div class="page">
    <SidebarPlaylists />
    <main class="main">
      <h2>播放源导入</h2>
      <ImportPanel />
    </main>
  </div>
</template>
<script setup lang="ts">
import SidebarPlaylists from '../components/SidebarPlaylists.vue'
import ImportPanel from '../components/ImportPanel.vue'
</script>
<style scoped>
.page { display:flex; height:100vh }
.main { flex:1; padding:16px }
</style>