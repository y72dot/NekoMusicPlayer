<template>
  <aside class="side">
    <nav class="nav">
      <router-link to="/library" class="nav-item" active-class="active">🎵 全部歌曲</router-link>
      <router-link to="/player" class="nav-item" active-class="active">🎧 正在播放</router-link>
      <router-link to="/import" class="nav-item" active-class="active">📥 导入音乐</router-link>
    </nav>
    <div class="sep"></div>
    <div class="top">
      <strong>歌单</strong>
      <button @click="create">新建</button>
    </div>
    <ul>
      <li v-for="p in playlists.playlists" :key="p.id" 
          :class="{active: p.id === currentId}" 
          @click="openPlaylist(p.id)">
        {{ p.name }}
      </li>
    </ul>
  </aside>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { usePlaylistsStore } from '../store/playlists'

const router = useRouter()
const route = useRoute()
const playlists = usePlaylistsStore()

const currentId = computed(() => route.params.id as string)

async function create() { 
  const name = prompt('歌单名称') || '新建歌单'
  await playlists.create(name)
  // After create, currentId is updated in store, navigate to it
  if (playlists.currentId) {
    router.push(`/playlist/${playlists.currentId}`)
  }
}

function openPlaylist(id: string) {
  router.push(`/playlist/${id}`)
}
</script>

<style scoped>
.side { width:220px; border-right:1px solid #ddd; padding:8px; display:flex; flex-direction:column; gap:8px }
.top { display:flex; justify-content:space-between; align-items:center }
ul { list-style:none; padding:0; margin:0 }
li { padding:6px 8px; border-radius:4px; cursor:pointer }
li:hover { background: #f5f5f5; }
li.active { background:#f0f0f0; font-weight: bold; }
.nav { display:flex; flex-direction:column; gap:4px }
.nav-item { padding:8px; text-decoration:none; color:#333; border-radius:4px }
.nav-item:hover { background:#f5f5f5 }
.nav-item.active { background:#e6f7ff; color:#1890ff; font-weight:bold }
.sep { height:1px; background:#eee; margin:8px 0 }
</style>