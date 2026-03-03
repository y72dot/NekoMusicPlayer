<template>
  <div class="library-page">
    <header class="header">
      <h2>全部歌曲</h2>
      <div class="actions">
        <span class="count">{{ playlists.library.length }} 首歌曲</span>
      </div>
    </header>
    
    <TrackList :tracks="playlists.library" :playlistId="'library'">
      <template #actions="{ track }">
        <ActionMenu 
          :trackId="track.id"
          @play="playTrack(track)"
          @addToQueue="addToQueue(track)"
          @addToPlaylist="addToPlaylist(track)"
          @remove="removeTrack(track)"
        />
      </template>
    </TrackList>

    <div v-if="playlists.library.length === 0" class="empty">
      暂无歌曲，请前往 <router-link to="/import">导入页面</router-link> 添加音乐。
    </div>

    <!-- Simple Playlist Selector Modal -->
    <div v-if="showSelector" class="modal-mask" @click="showSelector = false">
      <div class="modal" @click.stop>
        <h3>添加到歌单</h3>
        <ul>
          <li v-for="p in playlists.playlists" :key="p.id" @click="confirmAdd(p.id)">
            {{ p.name }}
          </li>
        </ul>
        <button @click="showSelector = false">取消</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { usePlaylistsStore } from '../store/playlists'
import { usePlayerStore } from '../store/player'
import { useSelectionStore } from '../store/selection'
import type { Track } from '../models/track'
import TrackList from '../components/TrackList.vue'
import ActionMenu from '../components/ActionMenu.vue'

const playlists = usePlaylistsStore()
const player = usePlayerStore()
const selection = useSelectionStore()

const showSelector = ref(false)
const selectedTrack = ref<Track | null>(null)

// If multi-select mode, we might be adding multiple tracks
const isMultiAdd = computed(() => selectedTrack.value === null && selection.isMultiSelectMode)

function playTrack(track: Track) {
  // If multi-select mode and this track is selected, play all selected
  if (selection.isMultiSelectMode && selection.isSelected(track.id)) {
    // Filter library tracks that are selected, preserving order
    const selectedTracks = playlists.library.filter(t => selection.isSelected(t.id))
    if (selectedTracks.length > 0) {
      player.setQueue(selectedTracks)
      player.play()
    }
  } else {
    // Normal play
    const idx = playlists.library.findIndex(t => t.id === track.id)
    if (idx >= 0) {
      player.setQueue(playlists.library, idx)
      player.play()
    }
  }
}

function addToQueue(track: Track) {
  if (selection.isMultiSelectMode && selection.isSelected(track.id)) {
    const selectedTracks = playlists.library.filter(t => selection.isSelected(t.id))
    selectedTracks.forEach(t => player.queue.push(t))
  } else {
    player.add(track)
  }
}

function addToPlaylist(track: Track) {
  if (selection.isMultiSelectMode && selection.isSelected(track.id)) {
    selectedTrack.value = null // Signal multi-add
  } else {
    selectedTrack.value = track
  }
  showSelector.value = true
}

async function removeTrack(track: Track) {
  const tracksToRemove = (selection.isMultiSelectMode && selection.isSelected(track.id))
    ? playlists.library.filter(t => selection.isSelected(t.id))
    : [track]
    
  if (confirm(`确定从库中移除 ${tracksToRemove.length} 首歌曲吗？`)) {
    // Remove all
    for (const t of tracksToRemove) {
      const idx = playlists.library.findIndex(x => x.id === t.id)
      if (idx >= 0) playlists.library.splice(idx, 1)
    }
    await playlists.persist()
    selection.clear()
  }
}

async function confirmAdd(playlistId: string) {
  let tracksToAdd: Track[] = []
  if (selectedTrack.value) {
    tracksToAdd = [selectedTrack.value]
  } else if (selection.isMultiSelectMode) {
    tracksToAdd = playlists.library.filter(t => selection.isSelected(t.id))
  }
  
  if (tracksToAdd.length > 0) {
    await playlists.addTracks(playlistId, tracksToAdd)
    showSelector.value = false
    selectedTrack.value = null
    selection.clear() // Clear selection after add
    alert(`已添加 ${tracksToAdd.length} 首歌曲`)
  }
}
</script>

<style scoped>
.library-page { display: flex; flex-direction: column; height: 100%; }
.header { display: flex; justify-content: space-between; align-items: center; padding: 16px; border-bottom: 1px solid #f0f0f0; background: #fff; position: sticky; top: 0; z-index: 5; }
.header h2 { margin: 0; font-size: 20px; }
.count { color: #888; font-size: 14px; }

.track-list { flex: 1; overflow-y: auto; }
.row { display: flex; align-items: center; justify-content: space-between; padding: 8px 16px; border-bottom: 1px solid #eee; }
.row:hover { background: #fafafa; }
.info { display: flex; align-items: center; gap: 12px; flex: 1; cursor: pointer; }
.index { width: 24px; color: #888; }
.cover { width: 40px; height: 40px; object-fit: cover; border-radius: 4px; }
.meta { display: flex; flex-direction: column; }
.title { font-weight: 600; }
.sub { font-size: 12px; color: #666; }
.ops button { padding: 4px 8px; cursor: pointer; }

.empty { padding: 40px; text-align: center; color: #888; }

.modal-mask { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); display: flex; justify-content: center; align-items: center; z-index: 100; }
.modal { background: #fff; padding: 20px; border-radius: 8px; width: 300px; max-height: 80vh; overflow-y: auto; }
.modal ul { list-style: none; padding: 0; margin: 0 0 16px 0; }
.modal li { padding: 10px; border-bottom: 1px solid #eee; cursor: pointer; }
.modal li:hover { background: #f5f5f5; }
.add-btn { padding: 4px 8px; cursor: pointer; border: 1px solid #ddd; background: #fff; border-radius: 4px; }
.add-btn:hover { background: #f0f0f0; }
</style>
