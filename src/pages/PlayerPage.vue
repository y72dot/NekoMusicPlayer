<template>
  <div class="player-page">
    <header class="header">
      <div class="default-header">
        <h2>{{ $t('player.title') }}</h2>
        <span class="count" v-if="player.queue.length">{{ $t('player.songCount', { count: `${filtered.length} / ${player.queue.length}` }) }}</span>
      </div>
      <div class="batch-overlay" v-if="selection.isMultiSelectMode">
        <BatchActionBar 
          :count="selection.selectedIds.size"
          @play="playTrack()"
          @addToQueue="addToQueue()"
          @addToPlaylist="addToPlaylist()"
          @remove="removeTrack()"
          @cancel="selection.clear()"
          @selectAll="selectAll()"
          @invertSelection="invertSelection()"
        />
      </div>
    </header>
    <SearchBar v-model="query" />
    <TrackList :tracks="filtered" :playlistId="'queue'">
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
      <p>{{ $t('player.emptyQueue') }}</p>
      <p>{{ $t('player.emptyHint') }}</p>
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
import { storeToRefs } from 'pinia'
import { usePlayerStore } from '@/store/player'
import { usePlaylistsStore } from '@/store/playlists'
import { useSelectionStore } from '@/store/selection'
import { useToastStore } from '@/store/toast'
import { useTrackFilter } from '@/composables/useTrackFilter'
import TrackList from '@/components/TrackList.vue'
import ActionMenu from '@/components/ActionMenu.vue'
import BatchActionBar from '@/components/BatchActionBar.vue'
import SearchBar from '@/components/SearchBar.vue'
import type { Track } from '@/models/track'

const player = usePlayerStore()
const playlists = usePlaylistsStore()
const selection = useSelectionStore()
const toast = useToastStore()

const { queue } = storeToRefs(player)
const { query, filtered } = useTrackFilter(queue)

const showSelector = ref(false)
const selectedTrack = ref<Track | null>(null)

function playTrack(index?: number, track?: Track) {
  if (selection.isMultiSelectMode && (!track || selection.isSelected(track.id))) {
    if (track && index !== undefined) {
      const realIndex = player.queue.findIndex(t => t.id === track.id)
      if (realIndex >= 0) {
        player.setQueue(player.queue, realIndex)
        player.play()
      }
    } else {
      const firstIndex = player.queue.findIndex(t => selection.isSelected(t.id))
      if (firstIndex >= 0) {
        player.setQueue(player.queue, firstIndex)
        player.play()
      }
    }
  } else if (index !== undefined && track) {
    const realIndex = player.queue.findIndex(t => t.id === track.id)
    if (realIndex >= 0) {
      player.setQueue(player.queue, realIndex)
      player.play()
    }
  }
}

function addToQueue(track?: Track) {
  // "加入队列" = 移到末尾，不重复
  if (selection.isMultiSelectMode && (!track || selection.isSelected(track.id))) {
    const selectedTracks = filtered.value.filter(t => selection.isSelected(t.id))
    selectedTracks.forEach(t => player.add(t))
  } else if (track) {
    player.add(track)
  }
}

function addToPlaylist(track?: Track) {
  if (selection.isMultiSelectMode && (!track || selection.isSelected(track.id))) {
    selectedTrack.value = null
  } else if (track) {
    selectedTrack.value = track
  }
  showSelector.value = true
}

async function confirmAdd(targetId: string) {
  let tracksToAdd: Track[] = []
  if (selectedTrack.value) {
    tracksToAdd = [selectedTrack.value]
  } else if (selection.isMultiSelectMode) {
    tracksToAdd = filtered.value.filter(t => selection.isSelected(t.id))
  }

  if (tracksToAdd.length > 0) {
    await playlists.addTracks(targetId, tracksToAdd)
    showSelector.value = false
    selectedTrack.value = null
    selection.clear()
    toast.success(`已添加 ${tracksToAdd.length} 首歌曲`)
  }
}

function removeTrack(index?: number, track?: Track) {
  const indicesToRemove: number[] = []
  
  if (selection.isMultiSelectMode && (!track || selection.isSelected(track.id))) {
    player.queue.forEach((t, i) => {
      if (selection.isSelected(t.id)) {
        indicesToRemove.push(i)
      }
    })
    selection.clear()
  } else if (index !== undefined) {
    indicesToRemove.push(index)
  }
  
  if (indicesToRemove.length > 0) {
    player.removeTracks(indicesToRemove)
  }
}

function selectAll() {
  filtered.value.forEach(t => {
    if (!selection.isSelected(t.id)) {
      selection.toggleSelection(t.id)
    }
  })
}

function invertSelection() {
  filtered.value.forEach(t => {
    selection.toggleSelection(t.id)
  })
}
</script>

<style scoped>
.player-page { display: flex; flex-direction: column; height: 100%; }
.header { position: sticky; top: 0; z-index: 5; background: #fff; border-bottom: 1px solid #f0f0f0; }
.default-header { display: flex; justify-content: space-between; align-items: center; padding: 16px; height: 100%; box-sizing: border-box; }
.batch-overlay { position: absolute; top: 0; left: 0; right: 0; bottom: 0; background: #fff; z-index: 10; }

.header h2 { margin: 0; font-size: 20px; }
.count { color: #888; font-size: 14px; }
.empty { display: flex; flex-direction: column; justify-content: center; align-items: center; flex: 1; color: #888; }
.modal-mask { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); display: flex; justify-content: center; align-items: center; z-index: 100; }
.modal { background: #fff; padding: 20px; border-radius: 8px; width: 300px; max-height: 80vh; overflow-y: auto; }
.modal ul { list-style: none; padding: 0; margin: 0 0 16px 0; }
.modal li { padding: 10px; border-bottom: 1px solid #eee; cursor: pointer; }
.modal li:hover { background: #f5f5f5; }
</style>
