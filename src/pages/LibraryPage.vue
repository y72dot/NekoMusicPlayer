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
          @play="playTrack(track)"
          @addToQueue="player.add(track)"
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
import { ref } from 'vue'
import { usePlaylistsStore } from '../store/playlists'
import { usePlayerStore } from '../store/player'
import type { Track } from '../models/track'
import TrackList from '../components/TrackList.vue'
import ActionMenu from '../components/ActionMenu.vue'

const playlists = usePlaylistsStore()
const player = usePlayerStore()

const showSelector = ref(false)
const selectedTrack = ref<Track | null>(null)

function playTrack(track: Track) {
  // Find index in library to play correctly
  const idx = playlists.library.findIndex(t => t.id === track.id)
  if (idx >= 0) {
    player.setQueue(playlists.library, idx)
    player.play()
  }
}

function addToPlaylist(track: Track) {
  selectedTrack.value = track
  showSelector.value = true
}

async function removeTrack(track: Track) {
  if (confirm(`确定从库中移除 "${track.title}" 吗？`)) {
    // Need to implement remove from library in store first
    // For now we just filter locally and save
    const idx = playlists.library.findIndex(t => t.id === track.id)
    if (idx >= 0) {
      playlists.library.splice(idx, 1)
      await playlists.persist()
    }
  }
}

async function confirmAdd(playlistId: string) {
  if (selectedTrack.value) {
    await playlists.addTracks(playlistId, [selectedTrack.value])
    showSelector.value = false
    selectedTrack.value = null
    alert('已添加')
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
