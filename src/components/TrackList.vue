<template>
  <div>
    <div v-for="(t,i) in tracks" :key="t.id" class="row" 
         :class="{ 
           active: player.current?.id === t.id,
           selected: selection.isSelected(t.id)
         }" 
         draggable="true"
         role="button"
         tabindex="0"
         :aria-label="`${t.title}, ${t.artist || $t('track.unknownArtist')}`"
         @dragstart="onDragStart(i)" @dragover.prevent @drop="onDrop(i)" 
         @click="handleRowClick(t, i)"
         @keydown.enter="handleRowClick(t, i)"
         @keydown.space.prevent="handleRowClick(t, i)">
      <span class="index">
        <span v-if="player.current?.id === t.id">🎵</span>
        <span v-else-if="selection.isSelected(t.id)">☑️</span>
        <span v-else>{{ i+1 }}</span>
      </span>
      <CoverImage :coverUrl="t.coverUrl" />
      <div class="meta">
        <div class="title" :class="{ 'active-text': player.current?.id === t.id }">{{ t.title }}</div>
        <div class="sub">{{ t.artist || $t('track.unknownArtist') }} · {{ t.sourceId }}</div>
      </div>
      <div class="actions" v-if="$slots.actions">
        <slot name="actions" :track="t" :index="i"></slot>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { Track } from '@/models/track'
import { usePlaylistsStore } from '@/store/playlists'
import { usePlayerStore } from '@/store/player'
import { useSelectionStore } from '@/store/selection'
import CoverImage from '@/components/CoverImage.vue'

const props = defineProps<{ tracks: Track[]; playlistId: string }>()
const emit = defineEmits<{
  (e: 'reorder', from: number, to: number): void
}>()

const playlists = usePlaylistsStore()
const player = usePlayerStore()
const selection = useSelectionStore()
let dragIndex = -1

function onDragStart(i: number) { dragIndex = i }
async function onDrop(i: number) { 
  if (dragIndex >= 0 && dragIndex !== i) {
    if (props.playlistId === 'queue') {
      await player.reorder(dragIndex, i)
    } else if (props.playlistId === 'library') {
      // Library typically doesn't support manual reordering
    } else {
      await playlists.reorder(props.playlistId, dragIndex, i)
    }
  }
  dragIndex = -1 
}

function handleRowClick(track: Track, index: number) {
  if (selection.isMultiSelectMode) {
    selection.toggleSelection(track.id)
  } else {
    play(index)
  }
}

async function play(i: number) { 
  // If playing from queue, we already have queue set.
  if (props.playlistId === 'queue') {
     await player.play(props.tracks[i])
     player.index = i
  } else {
    // Play Next logic: Insert after current and play immediately
    await player.playNext(props.tracks[i])
  }
}
</script>

<style scoped>
.row { display:flex; align-items:center; gap:12px; min-height:62px; padding:9px 16px; border-bottom:1px solid var(--color-border); cursor:pointer; transition: background-color 0.2s; }
.row:hover { background:#fafafa }
.row.active { background-color: var(--color-primary-soft); }
.row.selected { background-color: #f0f0f0; }
.row.selected.active { background-color: #d6e4ff; } /* Selected AND playing */
.index { width:24px; color:#888; display: flex; justify-content: center; }
.meta { display:flex; flex-direction:column }
.title { font-weight:600 }
.title.active-text { color: var(--color-primary-strong); }
.sub { font-size:12px; color:#666 }
.actions { margin-left: auto; }
@media (max-width:720px) {
  .row { gap:9px; padding:8px 12px; }
  .index { display:none; }
  .meta { min-width:0; }
  .title, .sub { overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
}
</style>
