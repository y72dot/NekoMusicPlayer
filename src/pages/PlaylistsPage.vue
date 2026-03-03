<template>
  <div class="playlist-page" v-if="playlist">
    <header class="header">
      <div class="info">
        <h2 v-if="!editing" @click="startEdit">{{ playlist.name }} <span class="edit-icon">✎</span></h2>
        <input v-else v-model="newName" @blur="saveName" @keyup.enter="saveName" ref="nameInput" />
        <div class="meta">
          <span>{{ playlist.tracks.length }} 首歌曲</span>
          <span>·</span>
          <span>创建于 {{ new Date(playlist.createdAt).toLocaleDateString() }}</span>
        </div>
      </div>
      <div class="actions">
        <button class="primary" @click="playAll">▶️ 播放全部</button>
        <button class="danger" @click="removePlaylist">🗑️ 删除歌单</button>
      </div>
    </header>
    
    <TrackList :tracks="playlist.tracks" :playlistId="playlist.id">
      <template #actions="{ track, index }">
        <ActionMenu 
          @play="playTrack(index)"
          @addToQueue="player.add(track)"
          @addToPlaylist="addToPlaylist(track)"
          @remove="removeTrack(index)"
        />
      </template>
    </TrackList>

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
  <div v-else class="empty-state">
    <p>请从左侧选择一个歌单，或新建歌单。</p>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, nextTick, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { usePlaylistsStore } from '../store/playlists'
import { usePlayerStore } from '../store/player'
import TrackList from '../components/TrackList.vue'
import ActionMenu from '../components/ActionMenu.vue'
import type { Track } from '../models/track'

const route = useRoute()
const router = useRouter()
const playlists = usePlaylistsStore()
const player = usePlayerStore()

const playlistId = computed(() => route.params.id as string)
const playlist = computed(() => playlists.playlists.find(p => p.id === playlistId.value))

const editing = ref(false)
const newName = ref('')
const nameInput = ref<HTMLInputElement | null>(null)
const showSelector = ref(false)
const selectedTrack = ref<Track | null>(null)

watch(playlist, (p) => {
  if (p) newName.value = p.name
}, { immediate: true })

function playTrack(index: number) {
  if (playlist.value) {
    player.setQueue(playlist.value.tracks, index)
    player.play()
  }
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

async function removeTrack(index: number) {
  if (playlist.value && confirm('从歌单中移除此歌曲？')) {
    playlist.value.tracks.splice(index, 1)
    await playlists.persist()
  }
}

async function startEdit() {
  editing.value = true
  await nextTick()
  nameInput.value?.focus()
}

async function saveName() {
  if (playlist.value && newName.value.trim()) {
    await playlists.rename(playlist.value.id, newName.value)
  }
  editing.value = false
}

async function playAll() {
  if (playlist.value && playlist.value.tracks.length > 0) {
    await player.setQueue(playlist.value.tracks)
    await player.play()
  }
}

async function removePlaylist() {
  if (playlist.value && confirm(`确定要删除歌单 "${playlist.value.name}" 吗？`)) {
    await playlists.remove(playlist.value.id)
    router.replace('/library')
  }
}
</script>

<style scoped>
.playlist-page { display: flex; flex-direction: column; height: 100%; }
.header { padding: 24px; background: #fff; border-bottom: 1px solid #f0f0f0; display: flex; justify-content: space-between; align-items: flex-start; }
.info h2 { margin: 0 0 8px 0; font-size: 24px; display: flex; align-items: center; gap: 8px; cursor: pointer; }
.info h2:hover .edit-icon { opacity: 1; }
.edit-icon { font-size: 16px; color: #999; opacity: 0; transition: opacity 0.2s; }
.info input { font-size: 24px; font-weight: bold; padding: 4px; width: 100%; box-sizing: border-box; }
.meta { color: #888; font-size: 14px; display: flex; gap: 8px; }

.actions { display: flex; gap: 12px; }
button { padding: 8px 16px; border-radius: 4px; border: none; cursor: pointer; font-size: 14px; font-weight: 500; transition: opacity 0.2s; }
button:hover { opacity: 0.9; }
button.primary { background: #1890ff; color: #fff; }
button.danger { background: #ff4d4f; color: #fff; }

.empty-state { display: flex; justify-content: center; align-items: center; height: 100%; color: #888; }
.modal-mask { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); display: flex; justify-content: center; align-items: center; z-index: 100; }
.modal { background: #fff; padding: 20px; border-radius: 8px; width: 300px; max-height: 80vh; overflow-y: auto; }
.modal ul { list-style: none; padding: 0; margin: 0 0 16px 0; }
.modal li { padding: 10px; border-bottom: 1px solid #eee; cursor: pointer; }
.modal li:hover { background: #f5f5f5; }
</style>
