<template>
  <div class="panel">
    <h3>{{ t('import.externalLinks') }}</h3>
    <textarea data-testid="external-url-input" v-model="urlText" :placeholder="t('import.urlPlaceholder')"></textarea>
    <button data-testid="external-url-import" @click="importUrls">{{ t('import.importUrls') }}</button>

    <h3>{{ t('import.netease.title') }}</h3>
    <textarea data-testid="netease-input" v-model="neteaseText" :placeholder="t('import.netease.placeholder')"></textarea>
    <div class="netease-row">
      <select data-testid="netease-type" v-model="neteaseType">
        <option value="auto">{{ t('import.netease.typeAuto') }}</option>
        <option value="song">{{ t('import.netease.typeSong') }}</option>
        <option value="playlist">{{ t('import.netease.typePlaylist') }}</option>
        <option value="album">{{ t('import.netease.typeAlbum') }}</option>
      </select>
      <button data-testid="netease-import" @click="importNetease" :disabled="neteaseLoading">
        {{ neteaseLoading ? '...' : t('import.netease.importBtn') }}
      </button>
    </div>
    <p
      v-if="!hasCookie"
      class="cookie-warning"
      data-testid="netease-cookie-warning"
      @click="showCookieSettings = !showCookieSettings"
      role="button"
    >{{ t('import.netease.cookieWarning') }}</p>
    <div v-if="showCookieSettings" class="cookie-settings" data-testid="netease-cookie-settings">
      <p class="cookie-guide">{{ t('import.netease.cookieGuide') }}</p>
      <label class="cookie-field">
        <span>{{ t('import.netease.cookieLabel') }}</span>
        <input v-model="cookieInput" type="text" placeholder="MUSIC_U" />
      </label>
      <label class="cookie-field">
        <span>{{ t('import.netease.csrfLabel') }}</span>
        <input v-model="csrfInput" type="text" placeholder="__csrf" />
      </label>
      <button data-testid="netease-cookie-save" @click="saveCookie">{{ t('import.netease.cookieSave') }}</button>
    </div>

    <h3>{{ t('import.bilibili.title') }}</h3>
    <textarea v-model="bilibiliText" :placeholder="t('import.bilibili.placeholder')"></textarea>
    <div class="netease-row">
      <button @click="importBilibili" :disabled="bilibiliLoading">
        {{ bilibiliLoading ? '...' : t('import.bilibili.importBtn') }}
      </button>
    </div>
    <p
      v-if="!hasBilibiliCookie"
      class="cookie-warning"
      @click="showBilibiliCookieSettings = !showBilibiliCookieSettings"
      role="button"
    >{{ t('import.bilibili.cookieWarning') }}</p>
    <div v-if="showBilibiliCookieSettings" class="cookie-settings">
      <p class="cookie-guide">{{ t('import.bilibili.cookieGuide') }}</p>
      <label class="cookie-field">
        <span>{{ t('import.bilibili.cookieLabel') }}</span>
        <input v-model="bilibiliSessdataInput" type="text" placeholder="SESSDATA" />
      </label>
      <label class="cookie-field">
        <span>{{ t('import.bilibili.csrfLabel') }}</span>
        <input v-model="bilibiliCsrfInput" type="text" placeholder="bili_jct" />
      </label>
      <label class="cookie-field">
        <span>{{ t('import.bilibili.buvid3Label') }}</span>
        <input v-model="bilibiliBuvid3Input" type="text" placeholder="buvid3" />
      </label>
      <button @click="saveBilibiliCookie">{{ t('import.bilibili.cookieSave') }}</button>
    </div>

    <h3>{{ t('import.localFiles') }}</h3>
    <input type="file" multiple @change="onFiles" accept="audio/*" />

    <h3>{{ t('import.jsonTitle') }}</h3>
    <div class="json">
      <button @click="onExport">{{ t('import.exportJson') }}</button>
      <input type="file" accept="application/json" @change="onImportJson" />
    </div>
  </div>
</template>
<script setup lang="ts">
import { ref, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { usePlaylistsStore } from '@/store/playlists'
import { useToastStore } from '@/store/toast'
import { useSettingsStore } from '@/store/settings'
import { registry } from '@/adapters/registry'

const { t } = useI18n()
const playlists = usePlaylistsStore()
const toast = useToastStore()
const settings = useSettingsStore()

const urlText = ref('')
const neteaseText = ref('')
const neteaseType = ref('auto')
const neteaseLoading = ref(false)
const showCookieSettings = ref(false)
const cookieInput = ref('')
const csrfInput = ref('')

const bilibiliText = ref('')
const bilibiliLoading = ref(false)
const showBilibiliCookieSettings = ref(false)
const bilibiliSessdataInput = ref('')
const bilibiliCsrfInput = ref('')
const bilibiliBuvid3Input = ref('')

const hasCookie = computed(() => Boolean(settings.settings.neteaseCookie))
const hasBilibiliCookie = computed(() => Boolean(settings.settings.bilibiliSessdata))

function saveCookie() {
  settings.setNeteaseCookie(cookieInput.value.trim())
  settings.setNeteaseCsrf(csrfInput.value.trim())
  showCookieSettings.value = false
  toast.success(t('import.netease.cookieSave'))
}

function saveBilibiliCookie() {
  settings.setBilibiliSessdata(bilibiliSessdataInput.value.trim())
  settings.setBilibiliCsrf(bilibiliCsrfInput.value.trim())
  settings.setBilibiliBuvid3(bilibiliBuvid3Input.value.trim())
  showBilibiliCookieSettings.value = false
  toast.success(t('import.bilibili.cookieSave'))
}

async function importBilibili() {
  const lines = bilibiliText.value.split(/\n/).map(s => s.trim()).filter(Boolean)
  if (!lines.length) return

  const adapter = registry.get('bilibili')
  if (!adapter) {
    console.error('Bilibili adapter not found')
    return
  }

  bilibiliLoading.value = true
  try {
    const tracks = await adapter.resolve(lines)
    await playlists.addToLibrary(tracks)
    bilibiliText.value = ''
    toast.success(t('import.success', { count: tracks.length }))
  } catch (e: any) {
    console.error('Failed to import from Bilibili:', e)
    const msg = e?.message || String(e)
    if (/cookie expired/i.test(msg)) {
      toast.error(t('toast.bilibiliCookieExpired'))
    } else if (/rate too high/i.test(msg)) {
      toast.error(t('toast.bilibiliRateLimit'))
    } else if (/access denied/i.test(msg)) {
      toast.error(t('toast.bilibiliAccessDenied'))
    } else if (/rate limited/i.test(msg)) {
      toast.error(t('toast.bilibiliGlobalRateLimit'))
    } else if (/not found/i.test(msg)) {
      toast.error(t('toast.bilibiliNotFound'))
    } else if (/no playable audio/i.test(msg)) {
      toast.error(t('toast.bilibiliNoAudio'))
    } else if (/timed out/i.test(msg)) {
      toast.error(t('toast.bilibiliTimeout'))
    } else {
      toast.error(msg || t('import.failed'))
    }
  } finally {
    bilibiliLoading.value = false
  }
}

async function importUrls() {
  const urls = urlText.value.split(/\n|,|\s/).map(s => s.trim()).filter(Boolean)
  if (!urls.length) return

  const adapter = registry.findByInput(urls)
  if (!adapter) {
    console.error('No adapter found for URLs:', urls)
    return
  }

  try {
    const tracks = await adapter.resolve(urls)
    await playlists.addToLibrary(tracks)
    urlText.value = ''
    toast.success(t('import.success', { count: tracks.length }))
  } catch (e) {
    console.error('Failed to resolve URLs:', e)
    toast.error(t('import.failed'))
  }
}

async function importNetease() {
  const lines = neteaseText.value.split(/\n/).map(s => s.trim()).filter(Boolean)
  if (!lines.length) return

  if (!hasCookie.value) {
    toast.error(t('toast.neteaseCookieRequired'))
    return
  }

  const adapter = registry.get('netease')
  if (!adapter) {
    console.error('Netease adapter not found')
    return
  }

  neteaseLoading.value = true
  try {
    let inputs = lines
    if (neteaseType.value !== 'auto') {
      inputs = lines.map(line => {
        if (/^\d+$/.test(line.trim())) {
          return `https://music.163.com/#/${neteaseType.value}?id=${line.trim()}`
        }
        return line
      })
    }

    const tracks = await adapter.resolve(inputs)
    await playlists.addToLibrary(tracks)
    neteaseText.value = ''
    toast.success(t('import.success', { count: tracks.length }))
  } catch (e: any) {
    console.error('Failed to import from Netease:', e)
    const msg = e?.message || String(e)
    if (/cookie/i.test(msg)) {
      toast.error(t('toast.neteaseCookieExpired'))
    } else if (/copyright/i.test(msg)) {
      toast.error(t('toast.neteaseCopyright'))
    } else if (/timed out/i.test(msg)) {
      toast.error(t('toast.neteaseTimeout'))
    } else if (/not found/i.test(msg)) {
      toast.error(t('toast.neteaseNotFound'))
    } else {
      toast.error(msg || t('import.failed'))
    }
  } finally {
    neteaseLoading.value = false
  }
}

async function onFiles(e: Event) {
  const input = e.target as HTMLInputElement
  const files = Array.from(input.files || [])
  if (!files.length) return

  const adapter = registry.findByInput(files)
  if (!adapter) {
    console.error('No adapter found for files')
    return
  }

  try {
    const tracks = await adapter.resolve(files)
    await playlists.addToLibrary(tracks)
    input.value = ''
    toast.success(t('import.success', { count: tracks.length }))
  } catch (e) {
    console.error('Failed to import files:', e)
    toast.error(t('import.failed'))
  }
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
.netease-row { display:flex; gap:8px; align-items:center }
.netease-row select { padding:4px 8px }
.netease-row button { padding:4px 16px }
.cookie-warning { color:#faad14; font-size:13px; margin:0; cursor:pointer; user-select:none }
.cookie-warning:hover { text-decoration:underline }
.cookie-settings { display:flex; flex-direction:column; gap:8px; padding:8px; background:#fafafa; border-radius:4px; border:1px solid #e8e8e8 }
.cookie-guide { font-size:12px; color:#888; margin:0 }
.cookie-field { display:flex; flex-direction:column; gap:2px; font-size:13px }
.cookie-field input { padding:4px 8px; border:1px solid #d9d9d9; border-radius:2px }
</style>
