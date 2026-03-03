<template>
  <div class="player-page">
    <header class="header">
      <h2>正在播放</h2>
      <span class="count" v-if="player.queue.length">{{ player.queue.length }} 首歌曲</span>
    </header>
    <TrackList :tracks="player.queue" :playlistId="'queue'" />
    <div v-if="player.queue.length === 0" class="empty">
      <p>当前播放队列为空。</p>
      <p>请从 <router-link to="/library">全部歌曲</router-link> 或歌单中播放音乐。</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { usePlayerStore } from '../store/player'
import TrackList from '../components/TrackList.vue'

const player = usePlayerStore()
</script>

<style scoped>
.player-page { display: flex; flex-direction: column; height: 100%; }
.header { display: flex; justify-content: space-between; align-items: center; padding: 16px; border-bottom: 1px solid #f0f0f0; background: #fff; position: sticky; top: 0; z-index: 5; }
.header h2 { margin: 0; font-size: 20px; }
.count { color: #888; font-size: 14px; }
.empty { display: flex; flex-direction: column; justify-content: center; align-items: center; flex: 1; color: #888; }
</style>
