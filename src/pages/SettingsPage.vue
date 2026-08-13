<template>
  <div class="settings-page">
    <header class="header">
      <h2>{{ $t('settings.title') }}</h2>
    </header>
    <div class="content">

      <!-- Playback Settings -->
      <section class="section">
        <h3>{{ $t('settings.playback.title') }}</h3>
        <div class="field">
          <label>{{ $t('settings.playback.defaultVolume') }}</label>
          <div class="volume-row">
            <input type="range" min="0" max="100" :value="Math.round(volume * 100)" @input="onVolumeInput" />
            <span class="volume-val">{{ Math.round(volume * 100) }}%</span>
          </div>
        </div>
        <div class="field">
          <label>{{ $t('settings.playback.defaultPlayMode') }}</label>
          <select :value="playMode" @change="onModeChange">
            <option value="single">{{ $t('mode.single') }}</option>
            <option value="loop">{{ $t('mode.loop') }}</option>
            <option value="shuffle">{{ $t('mode.shuffle') }}</option>
          </select>
        </div>
      </section>

      <!-- NetEase Cookie -->
      <section class="section">
        <h3>{{ $t('settings.netease.title') }}</h3>
        <p class="desc">{{ $t('settings.netease.description') }}</p>
        <p class="cookie-guide">{{ $t('import.netease.cookieGuide') }}</p>
        <div class="field">
          <label>{{ $t('import.netease.cookieLabel') }}</label>
          <div class="secret-row"><input v-model="neteaseCookie" :type="showSecrets ? 'text' : 'password'" autocomplete="off" placeholder="MUSIC_U" /><button type="button" @click="showSecrets = !showSecrets">{{ showSecrets ? $t('settings.security.hide') : $t('settings.security.show') }}</button></div>
        </div>
        <div class="field">
          <label>{{ $t('import.netease.csrfLabel') }}</label>
          <input v-model="neteaseCsrf" type="text" placeholder="__csrf" />
        </div>
        <button @click="saveNeteaseCookie">{{ $t('import.netease.cookieSave') }}</button>
        <button class="danger" @click="clearNetease">{{ $t('settings.security.clearNetease') }}</button>
      </section>

      <!-- Bilibili Cookie -->
      <section class="section">
        <h3>{{ $t('settings.bilibili.title') }}</h3>
        <p class="desc">{{ $t('settings.bilibili.description') }}</p>
        <p class="cookie-guide">{{ $t('import.bilibili.cookieGuide') }}</p>
        <div class="field">
          <label>{{ $t('import.bilibili.cookieLabel') }}</label>
          <input v-model="bilibiliSessdata" :type="showSecrets ? 'text' : 'password'" autocomplete="off" placeholder="SESSDATA" />
        </div>
        <div class="field">
          <label>{{ $t('import.bilibili.csrfLabel') }}</label>
          <input v-model="bilibiliCsrf" type="text" placeholder="bili_jct" />
        </div>
        <div class="field">
          <label>{{ $t('import.bilibili.buvid3Label') }}</label>
          <input v-model="bilibiliBuvid3" type="text" placeholder="buvid3" />
        </div>
        <button @click="saveBilibiliCookie">{{ $t('import.bilibili.cookieSave') }}</button>
        <button class="danger" @click="clearBilibili">{{ $t('settings.security.clearBilibili') }}</button>
      </section>

      <!-- Data Management -->
      <section class="section">
        <h3>{{ $t('settings.data.title') }}</h3>
        <p v-if="cacheStats.count > 0" class="desc">
          {{ $t('settings.data.cacheInfo', { count: cacheStats.count, size: formatSize(cacheStats.size) }) }}
        </p>
        <p v-else class="desc">{{ $t('settings.data.noCache') }}</p>
        <p v-if="storageEstimate.quota" class="desc">{{ $t('settings.data.storageUsage', { used: formatSize(storageEstimate.usage), quota: formatSize(storageEstimate.quota) }) }}</p>
        <div class="field">
          <label>{{ $t('settings.data.cacheLimit') }}</label>
          <input type="number" min="50" max="2000" step="50" :value="store.settings.cacheLimitMb" @change="setCacheLimit" />
        </div>
        <div v-for="(stats, source) in cacheBySource" :key="source" class="source-cache">
          <span>{{ source }} · {{ stats.count }} · {{ formatSize(stats.size) }}</span>
          <button @click="clearSource(String(source))">{{ $t('settings.data.clearSource') }}</button>
        </div>
        <button v-if="!clearing" @click="clearCache">{{ $t('settings.data.clearCache') }}</button>
        <button v-else disabled>{{ $t('settings.data.clearing') }}</button>
      </section>

    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useSettingsStore } from '@/store/settings'
import { audioCache } from '@/services/audioCache'

const store = useSettingsStore()
const showSecrets = ref(false)

// Playback settings (writable computed)
const volume = computed({
  get: () => store.settings.defaultVolume,
  set: (v: number) => store.setVolume(v),
})

const playMode = computed({
  get: () => store.settings.playMode,
  set: (m) => store.setMode(m),
})

function onVolumeInput(e: Event) {
  const target = e.target as HTMLInputElement
  volume.value = Number(target.value) / 100
}

function onModeChange(e: Event) {
  const target = e.target as HTMLSelectElement
  playMode.value = target.value as 'single' | 'loop' | 'shuffle'
}

// NetEase cookie (local refs initialized from store)
const neteaseCookie = ref(store.settings.neteaseCookie)
const neteaseCsrf = ref(store.settings.neteaseCsrf)

function saveNeteaseCookie() {
  store.setNeteaseCookie(neteaseCookie.value.trim())
  store.setNeteaseCsrf(neteaseCsrf.value.trim())
}

// Bilibili cookie (local refs initialized from store)
const bilibiliSessdata = ref(store.settings.bilibiliSessdata)
const bilibiliCsrf = ref(store.settings.bilibiliCsrf)
const bilibiliBuvid3 = ref(store.settings.bilibiliBuvid3)

function saveBilibiliCookie() {
  store.setBilibiliSessdata(bilibiliSessdata.value.trim())
  store.setBilibiliCsrf(bilibiliCsrf.value.trim())
  store.setBilibiliBuvid3(bilibiliBuvid3.value.trim())
}

function clearNetease() {
  store.clearNeteaseCredentials()
  neteaseCookie.value = ''
  neteaseCsrf.value = ''
}

function clearBilibili() {
  store.clearBilibiliCredentials()
  bilibiliSessdata.value = ''
  bilibiliCsrf.value = ''
  bilibiliBuvid3.value = ''
}

// Cache management
const cacheStats = ref({ count: 0, size: 0 })
const cacheBySource = ref<Record<string, { count: number; size: number }>>({})
const storageEstimate = ref({ usage: 0, quota: 0 })
const clearing = ref(false)

onMounted(async () => {
  cacheStats.value = await audioCache.getStats()
  cacheBySource.value = await audioCache.getStatsBySource()
  const estimate = await navigator.storage?.estimate?.()
  storageEstimate.value = { usage: estimate?.usage || 0, quota: estimate?.quota || 0 }
})

async function clearCache() {
  if (!confirm('确定要清除所有缓存的音频文件吗？')) return
  clearing.value = true
  await audioCache.clear()
  cacheStats.value = await audioCache.getStats()
  cacheBySource.value = {}
  clearing.value = false
}

async function clearSource(sourceId: string) {
  await audioCache.clearSource(sourceId)
  cacheStats.value = await audioCache.getStats()
  cacheBySource.value = await audioCache.getStatsBySource()
}

function setCacheLimit(event: Event) {
  store.setCacheLimitMb(Number((event.target as HTMLInputElement).value))
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
}
</script>

<style scoped>
.settings-page { display: flex; flex-direction: column; height: 100%; }
.header { position: sticky; top: 0; z-index: 5; background: #fff; border-bottom: 1px solid #f0f0f0; padding: 16px; }
.header h2 { margin: 0; font-size: 20px; }
.content { flex: 1; overflow-y: auto; padding: 16px; display: flex; flex-direction: column; gap: 24px; }
.section { display: flex; flex-direction: column; gap: 8px; }
.section h3 { margin: 0; font-size: 16px; border-bottom: 1px solid #f0f0f0; padding-bottom: 4px; }
.desc { font-size: 13px; color: #888; margin: 0; }
.cookie-guide { font-size: 12px; color: #aaa; margin: 0; }
.field { display: flex; flex-direction: column; gap: 4px; }
.field label { font-size: 13px; color: #555; }
.field input, .field select { padding: 6px 8px; border: 1px solid #d9d9d9; border-radius: 4px; font-size: 14px; }
.secret-row, .source-cache { display:flex; align-items:center; gap:8px; }
.secret-row input { flex:1; min-width:0; }
.source-cache { justify-content:space-between; padding:8px 0; border-bottom:1px solid var(--color-border); font-size:13px; }
.danger { color:var(--color-danger); }
.volume-row { display: flex; align-items: center; gap: 12px; }
.volume-row input[type="range"] { flex: 1; }
.volume-val { font-size: 14px; color: #555; min-width: 40px; }
button { align-self: flex-start; padding: 6px 16px; border: 1px solid #d9d9d9; border-radius: 4px; background: #fff; cursor: pointer; font-size: 14px; }
button:hover { border-color: #1890ff; color: #1890ff; }
button:disabled { color: #bbb; cursor: not-allowed; }
</style>
