<template>
  <div class="layout">
    <SidebarPlaylists />
    <main class="main">
      <header class="header">
        <h2>{{ title }}</h2>
        <nav>
          <router-link to="/import">导入</router-link>
          <router-link to="/playlists">歌单管理</router-link>
        </nav>
      </header>
      <TrackList :tracks="currentTracks" :playlistId="currentId" />
      <ControlBar />
    </main>
  </div>
 </template>
 <script setup lang="ts">
 import { computed } from 'vue'
 import { usePlaylistsStore } from '../store/playlists'
 import SidebarPlaylists from '../components/SidebarPlaylists.vue'
 import TrackList from '../components/TrackList.vue'
 import ControlBar from '../components/ControlBar.vue'
 const playlists = usePlaylistsStore()
 const title = computed(() => playlists.current?.name || '未选择歌单')
 const currentTracks = computed(() => playlists.current?.tracks || [])
 const currentId = computed(() => playlists.current?.id || '')
 </script>
 <style scoped>
 .layout { display:flex; height:100vh }
 .main { flex:1; display:flex; flex-direction:column }
 .header { display:flex; justify-content:space-between; align-items:center; padding:8px 16px; border-bottom:1px solid #ddd }
 main > * { padding:0 16px }
 </style>