<template>
  <div>
    <div v-for="(t,i) in tracks" :key="t.id" class="row" 
         :class="{ 
           active: player.current?.id === t.id,
           selected: selection.isSelected(t.id)
         }" 
         draggable="true"
         @dragstart="onDragStart(i)" @dragover.prevent @drop="onDrop(i)" 
         @click="handleRowClick(t, i)">
      <span class="index">
        <span v-if="player.current?.id === t.id">🎵</span>
        <span v-else-if="selection.isSelected(t.id)">☑️</span>
        <span v-else>{{ i+1 }}</span>
      </span>
      <img v-if="t.coverUrl" :src="t.coverUrl" class="cover" />
      <div class="meta">
        <div class="title" :class="{ 'active-text': player.current?.id === t.id }">{{ t.title }}</div>
        <div class="sub">{{ t.artist || '未知艺术家' }} · {{ t.sourceId }}</div>
      </div>
      <div class="actions" v-if="$slots.actions">
        <slot name="actions" :track="t" :index="i"></slot>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { Track } from '../models/track'
import { usePlaylistsStore } from '../store/playlists'
import { usePlayerStore } from '../store/player'
import { useSelectionStore } from '../store/selection'

const props = defineProps<{ tracks: Track[]; playlistId: string }>()
const playlists = usePlaylistsStore()
const player = usePlayerStore()
const selection = useSelectionStore()
let dragIndex = -1

function onDragStart(i: number) { dragIndex = i }
async function onDrop(i: number) { if (dragIndex >= 0 && dragIndex !== i) await playlists.reorder(props.playlistId, dragIndex, i); dragIndex = -1 }

function handleRowClick(track: Track, index: number) {
  if (selection.isMultiSelectMode) {
    selection.toggleSelection(track.id)
  } else {
    play(index)
  }
}

async function play(i: number) { 
  await player.setQueue(props.tracks, i)
  await player.play()
}
</script>

<style scoped>
.row { display:flex; align-items:center; gap:12px; padding:8px; border-bottom:1px solid #eee; cursor:pointer; transition: background-color 0.2s; }
.row:hover { background:#fafafa }
.row.active { background-color: #e6f7ff; }
.row.selected { background-color: #f0f0f0; }
.row.selected.active { background-color: #d6e4ff; } /* Selected AND playing */
.index { width:24px; color:#888; display: flex; justify-content: center; }
.cover { width:40px; height:40px; object-fit:cover; border-radius:4px }
.meta { display:flex; flex-direction:column }
.title { font-weight:600 }
.title.active-text { color: #1890ff; }
.sub { font-size:12px; color:#666 }
.actions { margin-left: auto; }
</style>