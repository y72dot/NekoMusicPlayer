<template>
  <div class="bar">
    <button @click="prev">⏮</button>
    <button @click="toggle">{{ player.playing ? '⏸' : '▶️' }}</button>
    <button @click="next">⏭</button>
    <input type="range" min="0" :max="player.duration" step="0.1" :value="player.currentTime" @input="onSeek" />
    <span>{{ timeText }}</span>
    <select v-model="mode" @change="onMode">
      <option value="single">单曲循环</option>
      <option value="loop">列表循环</option>
      <option value="shuffle">随机</option>
    </select>
    <input type="range" min="0" max="1" step="0.01" :value="player.volume" @input="onVolume" />
  </div>
</template>
<script setup lang="ts">
import { computed, watch } from 'vue'
import { usePlayerStore } from '@/store/player'
import { useSettingsStore } from '@/store/settings'

const player = usePlayerStore()
const settings = useSettingsStore()
const mode = computed({ get: () => player.mode, set: v => settings.setMode(v) })
// Watcher for settings mode is no longer needed to update Engine, 
// because Store state updates (via settings.setMode) update PlayerStore mode, 
// and Engine doesn't track mode anymore.
// However, PlayerStore.mode is derived from settings store in `state`.
// But `setMode` action in PlayerStore updates local state AND settings?
// Let's check PlayerStore.setMode -> updates `this.mode`.
// SettingsStore.setMode -> updates settings.
// In ControlBar, we should use SettingsStore for persistence.
// Let's simplify: ControlBar interacts with PlayerStore/SettingsStore.

function toggle() { player.toggle() }
function next() { player.next() }
function prev() { player.prev() }
function onSeek(e: Event) { const v = Number((e.target as HTMLInputElement).value); player.seek(v) }
function onVolume(e: Event) { const v = Number((e.target as HTMLInputElement).value); player.setVolume(v); settings.setVolume(v) }
function onMode() { settings.setMode(mode.value); player.setMode(mode.value) }

const timeText = computed(() => `${format(player.currentTime)} / ${format(player.duration)}`)
function format(s: number) {
  const m = Math.floor(s / 60)
  const ss = Math.floor(s % 60)
  return `${m}:${String(ss).padStart(2,'0')}`
}
</script>
<style scoped>
.bar { display: flex; align-items: center; gap: 8px; padding: 8px; border-top: 1px solid #ddd }
button { padding: 4px 8px }
input[type="range"] { width: 200px }
</style>