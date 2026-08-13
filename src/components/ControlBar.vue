<template>
  <div class="bar" :aria-label="$t('controls.player')">
    <div class="now-playing">
      <CoverImage class="mini-cover" :coverUrl="player.current?.coverUrl" />
      <div class="track-copy">
        <div class="track-title">{{ player.current?.title || $t('controls.nothingPlaying') }}</div>
        <div class="track-subtitle">{{ player.current?.artist || statusText }}</div>
      </div>
    </div>
    <div class="transport">
      <div class="transport-buttons">
        <button class="icon-button" :aria-label="$t('controls.previous')" :title="$t('controls.previous')" :disabled="!player.queue.length" @click="prev"><span aria-hidden="true">⏮</span></button>
        <button class="play-button" :aria-label="player.playing ? $t('controls.pause') : $t('controls.play')" :title="player.playing ? $t('controls.pause') : $t('controls.play')" @click="toggle"><span aria-hidden="true">{{ player.playing ? '⏸' : '▶️' }}</span></button>
        <button class="icon-button" :aria-label="$t('controls.next')" :title="$t('controls.next')" :disabled="!player.queue.length" @click="next"><span aria-hidden="true">⏭</span></button>
      </div>
      <div class="progress-row">
        <input :aria-label="$t('controls.seek')" type="range" min="0" :max="Math.max(player.duration, 0)" step="0.1" :value="player.currentTime" :disabled="!player.current" @input="onSeek" />
        <span class="time-text">{{ timeText }}</span>
      </div>
    </div>
    <div class="secondary-controls">
      <label class="sr-only" for="play-mode">{{ $t('controls.mode') }}</label>
      <select id="play-mode" v-model="mode" @change="onMode">
      <option value="single">{{ $t('mode.single') }}</option>
      <option value="loop">{{ $t('mode.loop') }}</option>
      <option value="shuffle">{{ $t('mode.shuffle') }}</option>
    </select>
      <label class="volume-control"><span aria-hidden="true">♬</span><span class="sr-only">{{ $t('controls.volume') }}</span><input :aria-label="$t('controls.volume')" type="range" min="0" max="1" step="0.01" :value="player.volume" @input="onVolume" /></label>
    </div>
  </div>
</template>
<script setup lang="ts">
import { computed } from 'vue'
import { usePlayerStore } from '@/store/player'
import { useSettingsStore } from '@/store/settings'
import CoverImage from '@/components/CoverImage.vue'

const player = usePlayerStore()
const settings = useSettingsStore()
const mode = computed({ get: () => player.mode, set: v => settings.setMode(v) })
// Mode is managed via SettingsStore for persistence, PlayerStore for playback logic.

function toggle() { player.toggle() }
function next() { player.next() }
function prev() { player.prev() }
function onSeek(e: Event) { const v = Number((e.target as HTMLInputElement).value); player.seek(v) }
function onVolume(e: Event) { const v = Number((e.target as HTMLInputElement).value); player.setVolume(v); settings.setVolume(v) }
function onMode() { settings.setMode(mode.value); player.setMode(mode.value) }

const timeText = computed(() => `${format(player.currentTime)} / ${format(player.duration)}`)
const statusText = computed(() => player.status === 'loading' ? 'Loading…' : player.status === 'error' ? player.lastError?.message || 'Error' : '')
function format(s: number) {
  const m = Math.floor(s / 60)
  const ss = Math.floor(s % 60)
  return `${m}:${String(ss).padStart(2,'0')}`
}
</script>
<style scoped>
.bar { min-height:94px; display:grid; grid-template-columns:minmax(170px,1fr) minmax(300px,2fr) minmax(190px,1fr); align-items:center; gap:20px; padding:12px 20px calc(12px + env(safe-area-inset-bottom)); box-shadow:0 -4px 20px rgba(31,34,51,.05); }
.now-playing { min-width:0; display:flex; align-items:center; gap:12px; }
.mini-cover { width:52px; height:52px; flex:0 0 52px; border-radius:12px; overflow:hidden; }
.track-copy { min-width:0; }
.track-title { overflow:hidden; text-overflow:ellipsis; white-space:nowrap; font-weight:700; }
.track-subtitle { margin-top:3px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; color:var(--color-text-muted); font-size:12px; }
.transport { min-width:0; display:flex; flex-direction:column; align-items:center; gap:8px; }
.transport-buttons { display:flex; align-items:center; gap:8px; }
button { display:grid; place-items:center; border:0; background:transparent; color:var(--color-text); cursor:pointer; }
.icon-button { width:38px; height:38px; }
.icon-button:hover { background:var(--color-surface-muted); }
.play-button { width:44px; height:44px; border-radius:50%; color:#fff; background:var(--color-primary); box-shadow:0 8px 20px rgba(109,93,252,.3); }
.play-button:hover { background:var(--color-primary-strong); transform:translateY(-1px); }
.progress-row { width:min(100%,560px); display:grid; grid-template-columns:minmax(80px,1fr) auto; align-items:center; gap:12px; }
.progress-row input { width:100%; }
.time-text { min-width:76px; color:var(--color-text-muted); font-variant-numeric:tabular-nums; font-size:12px; text-align:right; }
.secondary-controls { display:flex; justify-content:flex-end; align-items:center; gap:12px; }
select { max-width:120px; border:1px solid var(--color-border); background:var(--color-surface); color:var(--color-text); padding:7px 9px; }
.volume-control { display:flex; align-items:center; gap:7px; color:var(--color-text-muted); }
.volume-control input { width:92px; }

@media (max-width:900px) {
  .bar { grid-template-columns:minmax(130px,1fr) minmax(250px,2fr); }
  .secondary-controls { display:none; }
}
@media (max-width:720px) {
  .bar { min-height:74px; grid-template-columns:minmax(0,1fr) auto; gap:8px; padding:8px 12px; }
  .mini-cover { width:44px; height:44px; flex-basis:44px; }
  .transport { flex-direction:row; }
  .transport-buttons { gap:1px; }
  .icon-button { display:none; }
  .progress-row { display:none; }
  .play-button { width:42px; height:42px; }
}
</style>
