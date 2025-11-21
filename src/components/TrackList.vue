<template>
  <div>
    <div v-for="(t,i) in tracks" :key="t.id" class="row" draggable="true"
         @dragstart="onDragStart(i)" @dragover.prevent @drop="onDrop(i)" @click="play(i)">
      <span class="index">{{ i+1 }}</span>
      <img v-if="t.coverUrl" :src="t.coverUrl" class="cover" />
      <div class="meta">
        <div class="title">{{ t.title }}</div>
        <div class="sub">{{ t.artist || '未知艺术家' }} · {{ t.sourceId }}</div>
      </div>
    </div>
  </div>
</template>
<script setup lang="ts">
import type { Track } from '../models/track'
import { usePlaylistsStore } from '../store/playlists'
import { usePlayerStore } from '../store/player'
import { playerEngine } from '../core/playerEngine'

const props = defineProps<{ tracks: Track[]; playlistId: string }>()
const playlists = usePlaylistsStore()
const player = usePlayerStore()
let dragIndex = -1

function onDragStart(i: number) { dragIndex = i }
async function onDrop(i: number) { if (dragIndex >= 0 && dragIndex !== i) await playlists.reorder(props.playlistId, dragIndex, i); dragIndex = -1 }
async function play(i: number) { await playerEngine.loadQueue(playlists.current?.tracks || [], i); playerEngine.play() }
</script>
<style scoped>
.row { display:flex; align-items:center; gap:12px; padding:8px; border-bottom:1px solid #eee; cursor:pointer }
.row:hover { background:#fafafa }
.index { width:24px; color:#888 }
.cover { width:40px; height:40px; object-fit:cover; border-radius:4px }
.meta { display:flex; flex-direction:column }
.title { font-weight:600 }
.sub { font-size:12px; color:#666 }
</style>