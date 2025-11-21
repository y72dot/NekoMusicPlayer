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
import { usePlayerStore } from '../store/player'
import { useSettingsStore } from '../store/settings'
import { playerEngine } from '../core/playerEngine'

const player = usePlayerStore()
const settings = useSettingsStore()
const mode = computed({ get: () => player.mode, set: v => playerEngine.setMode(v) })
watch(() => settings.settings.playMode, m => playerEngine.setMode(m))

function toggle() { player.playing ? playerEngine.pause() : playerEngine.play() }
function next() { playerEngine.next(); playerEngine.play() }
function prev() { playerEngine.prev(); playerEngine.play() }
function onSeek(e: Event) { const v = Number((e.target as HTMLInputElement).value); playerEngine.seek(v) }
function onVolume(e: Event) { const v = Number((e.target as HTMLInputElement).value); playerEngine.setVolume(v); settings.setVolume(v) }
function onMode() { settings.setMode(mode.value) }

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