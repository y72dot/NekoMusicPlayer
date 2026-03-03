<template>
  <div class="player-page">
    <header class="header">
      <h2>正在播放</h2>
      <span class="count" v-if="player.queue.length">{{ player.queue.length }} 首歌曲</span>
    </header>
    <TrackList :tracks="player.queue" :playlistId="'queue'">
      <template #actions="{ track, index }">
        <ActionMenu 
          @play="playTrack(index)"
          @addToQueue="player.add(track)"
          @addToPlaylist="addToPlaylist(track)"
          @remove="removeTrack(index)"
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
import TrackList from '../components/TrackList.vue'
import ActionMenu from '../components/ActionMenu.vue'
import type { Track } from '../models/track'

const player = usePlayerStore()
const playlists = usePlaylistsStore()

const showSelector = ref(false)
const selectedTrack = ref<Track | null>(null)

function playTrack(index: number) {
  player.setQueue(player.queue, index)
  player.play()
}

function addToPlaylist(track: Track) {
  selectedTrack.value = track
  showSelector.value = true
}

async function confirmAdd(targetId: string) {
  if (selectedTrack.value) {
    await playlists.addTracks(targetId, [selectedTrack.value])
    showSelector.value = false
    selectedTrack.value = null
    alert('已添加')
  }
}

function removeTrack(index: number) {
  player.queue.splice(index, 1)
  // If current playing track is removed, handle it?
  // For simplicity, just remove from queue array
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
