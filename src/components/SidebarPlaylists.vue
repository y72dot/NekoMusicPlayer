<template>
  <aside class="side">
    <nav class="nav">
      <router-link to="/library" class="nav-item" active-class="active">🎵 全部歌曲</router-link>
      <router-link to="/player" class="nav-item" active-class="active">🎧 正在播放</router-link>
      <router-link to="/import" class="nav-item" active-class="active">📥 导入音乐</router-link>
      <router-link to="/playlists" class="nav-item" active-class="active">⚙️ 歌单管理</router-link>
    </nav>
    <div class="sep"></div>
    <div class="top">
      <strong>歌单</strong>
      <button @click="create">新建</button>
    </div>
    <ul>
      <li v-for="p in playlists.playlists" :key="p.id" :class="{active: p.id===playlists.currentId}" @click="playlists.setCurrent(p.id)">{{ p.name }}</li>
    </ul>
    <div v-if="playlists.current" class="ops">
      <input v-model="newName" />
      <button @click="rename">重命名</button>
      <button @click="remove">删除</button>
    </div>
  </aside>
</template>
<script setup lang="ts">
import { ref, watch } from 'vue'
import { usePlaylistsStore } from '../store/playlists'

const playlists = usePlaylistsStore()
const newName = ref('')
// 监听当前歌单变化，更新输入框显示；不在此重复调用 init，避免状态被覆盖
watch(() => playlists.current, (cur) => { newName.value = cur?.name || '' }, { immediate: true })
async function create() { const name = prompt('歌单名称') || '新建歌单'; await playlists.create(name); newName.value = playlists.current?.name || '' }
async function rename() { if (!playlists.current) return; await playlists.rename(playlists.current.id, newName.value) }
async function remove() { if (!playlists.current) return; if (confirm('删除当前歌单？')) await playlists.remove(playlists.current.id) }
</script>
<style scoped>
.side { width:220px; border-right:1px solid #ddd; padding:8px; display:flex; flex-direction:column; gap:8px }
.top { display:flex; justify-content:space-between; align-items:center }
ul { list-style:none; padding:0; margin:0 }
li { padding:6px 8px; border-radius:4px; cursor:pointer }
li.active { background:#f0f0f0 }
.ops { display:flex; gap:6px }
input { flex:1 }
.nav { display:flex; flex-direction:column; gap:4px }
.nav-item { padding:8px; text-decoration:none; color:#333; border-radius:4px }
.nav-item:hover { background:#f5f5f5 }
.nav-item.active { background:#e6f7ff; color:#1890ff; font-weight:bold }
.sep { height:1px; background:#eee; margin:8px 0 }
</style>