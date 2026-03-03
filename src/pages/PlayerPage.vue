<template>
  <div class="player-page">
    <header class="header">
      <h2>{{ title }}</h2>
      <span class="count" v-if="currentTracks.length">{{ currentTracks.length }} 首歌曲</span>
    </header>
    <TrackList :tracks="currentTracks" :playlistId="currentId" />
  </div>
</template>
<script setup lang="ts">
import { computed } from 'vue'
import { usePlaylistsStore } from '../store/playlists'
import TrackList from '../components/TrackList.vue'

const playlists = usePlaylistsStore()
const title = computed(() => playlists.current?.name || '未选择歌单')
const currentTracks = computed(() => playlists.current?.tracks || [])
const currentId = computed(() => playlists.current?.id || '')
</script>
<style scoped>
.player-page { display: flex; flex-direction: column; height: 100%; }
.header { display: flex; justify-content: space-between; align-items: center; padding: 16px; border-bottom: 1px solid #f0f0f0; background: #fff; position: sticky; top: 0; z-index: 5; }
.header h2 { margin: 0; font-size: 20px; }
.count { color: #888; font-size: 14px; }
</style>
