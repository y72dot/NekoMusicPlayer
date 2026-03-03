<template>
  <div class="player-page">
    <header class="header">
      <h2>正在播放</h2>
      <span class="count" v-if="player.queue.length">{{ player.queue.length }} 首歌曲</span>
    </header>
    <TrackList :tracks="player.queue" :playlistId="'queue'">
      <template #actions="{ track, index }">
        <ActionMenu 
          :trackId="track.id"
          @play="playTrack(index, track)"
          @addToQueue="addToQueue(track)"
          @addToPlaylist="addToPlaylist(track)"
          @remove="removeTrack(index, track)"
        />
      </template>
    </TrackList>
    <div v-if="player.queue.length === 0" class="empty">
      <p>当前播放队列为空。</p>
      <p>请从 <router-link to="/library">全部歌曲</router-link> 或歌单中播放音乐。</p>
    </div>
    
    <!-- Playlist Selector Modal -->
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
import { ref } from 'vue'
import { usePlayerStore } from '../store/player'
import { usePlaylistsStore } from '../store/playlists'
import { useSelectionStore } from '../store/selection'
import TrackList from '../components/TrackList.vue'
import ActionMenu from '../components/ActionMenu.vue'
import type { Track } from '../models/track'

const player = usePlayerStore()
const playlists = usePlaylistsStore()
const selection = useSelectionStore()

const showSelector = ref(false)
const selectedTrack = ref<Track | null>(null)

function playTrack(index: number, track: Track) {
  if (selection.isMultiSelectMode && selection.isSelected(track.id)) {
    // If multi-playing from queue, just play the first selected one?
    // Or filter queue to only selected? Usually in queue page, play means jump to.
    // Let's stick to jump to clicked one for now even in multi-select, 
    // unless we want to "play only selected".
    // For simplicity: Jump to clicked track.
    player.setQueue(player.queue, index)
    player.play()
  } else {
    player.setQueue(player.queue, index)
    player.play()
  }
}

function addToQueue(track: Track) {
  // In PlayerPage (Queue), "Add to Queue" usually means duplicate? 
  // Or maybe we hide this button in Queue page? 
  // Let's implement duplicate for consistency.
  if (selection.isMultiSelectMode && selection.isSelected(track.id)) {
    const selectedTracks = player.queue.filter(t => selection.isSelected(t.id))
    selectedTracks.forEach(t => player.queue.push({ ...t, id: crypto.randomUUID() })) // New ID for duplicate
  } else {
    player.queue.push({ ...track, id: crypto.randomUUID() })
  }
}

function addToPlaylist(track: Track) {
  if (selection.isMultiSelectMode && selection.isSelected(track.id)) {
    selectedTrack.value = null
  } else {
    selectedTrack.value = track
  }
  showSelector.value = true
}

async function confirmAdd(targetId: string) {
  let tracksToAdd: Track[] = []
  if (selectedTrack.value) {
    tracksToAdd = [selectedTrack.value]
  } else if (selection.isMultiSelectMode) {
    tracksToAdd = player.queue.filter(t => selection.isSelected(t.id))
  }

  if (tracksToAdd.length > 0) {
    await playlists.addTracks(targetId, tracksToAdd)
    showSelector.value = false
    selectedTrack.value = null
    selection.clear()
    alert(`已添加 ${tracksToAdd.length} 首歌曲`)
  }
}

function removeTrack(index: number, track: Track) {
  if (selection.isMultiSelectMode && selection.isSelected(track.id)) {
    // Remove all selected from queue
    // Filter in place
    const idsToRemove = new Set(player.queue.filter(t => selection.isSelected(t.id)).map(t => t.id))
    // We need to handle current playing index if we remove tracks before it
    // This is complex. For now, simple filter.
    const newQueue = player.queue.filter(t => !idsToRemove.has(t.id))
    
    // If current track is removed, stop or next?
    const currentId = player.current?.id
    if (currentId && idsToRemove.has(currentId)) {
      player.pause() // Simple fallback
    }
    
    player.queue = newQueue
    selection.clear()
  } else {
    player.queue.splice(index, 1)
  }
}
</script>

<style scoped>
.player-page { display: flex; flex-direction: column; height: 100%; }
.header { display: flex; justify-content: space-between; align-items: center; padding: 16px; border-bottom: 1px solid #f0f0f0; background: #fff; position: sticky; top: 0; z-index: 5; }
.header h2 { margin: 0; font-size: 20px; }
.count { color: #888; font-size: 14px; }
.empty { display: flex; flex-direction: column; justify-content: center; align-items: center; flex: 1; color: #888; }
.modal-mask { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); display: flex; justify-content: center; align-items: center; z-index: 100; }
.modal { background: #fff; padding: 20px; border-radius: 8px; width: 300px; max-height: 80vh; overflow-y: auto; }
.modal ul { list-style: none; padding: 0; margin: 0 0 16px 0; }
.modal li { padding: 10px; border-bottom: 1px solid #eee; cursor: pointer; }
.modal li:hover { background: #f5f5f5; }
</style>
