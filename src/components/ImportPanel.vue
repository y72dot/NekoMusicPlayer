<template>
  <div class="panel">
    <h3>导入外链</h3>
    <textarea v-model="urlText" placeholder="每行一个 URL"></textarea>
    <button @click="importUrls">导入</button>
    <h3>导入本地文件</h3>
    <input type="file" multiple @change="onFiles" accept="audio/*" />
    <h3>导入/导出 JSON</h3>
    <div class="json">
      <button @click="onExport">导出当前所有歌单</button>
      <input type="file" accept="application/json" @change="onImportJson" />
    </div>
  </div>
</template>
<script setup lang="ts">
import { ref } from 'vue'
import { usePlaylistsStore } from '../store/playlists'
import { registry } from '../adapters/registry'

const playlists = usePlaylistsStore()
const urlText = ref('')

async function importUrls() {
  const urls = urlText.value.split(/\n|,|\s/).map(s => s.trim()).filter(Boolean)
  const adapter = registry.findByInput(urls)
  if (!adapter || !playlists.current) return
  const tracks = await adapter.resolve(urls)
  await playlists.addTracks(playlists.current.id, tracks)
  urlText.value = ''
}

async function onFiles(e: Event) {
  const files = Array.from((e.target as HTMLInputElement).files || [])
  const adapter = registry.findByInput(files)
  if (!adapter || !playlists.current) return
  const tracks = await adapter.resolve(files)
  await playlists.addTracks(playlists.current.id, tracks)
}

function onExport() {
  const json = playlists.exportJson()
  const blob = new Blob([json], { type: 'application/json' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = 'playlists.json'
  a.click()
}

async function onImportJson(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (!file) return
  const text = await file.text()
  playlists.importJson(text)
}
</script>
<style scoped>
.panel { display:flex; flex-direction:column; gap:8px; padding:8px }
textarea { width:100%; min-height:120px }
.json { display:flex; gap:8px; align-items:center }
</style>