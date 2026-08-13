import { createApp } from 'vue'
import { createPinia } from 'pinia'
import piniaPluginPersistedstate from 'pinia-plugin-persistedstate'
import App from '@/App.vue'
import router from '@/router'
import i18n from '@/i18n'
import { registerAdapters } from '@/adapters/register'
import { setupPlayerBridge } from '@/services/playerBridge'
import { usePlaylistsStore } from '@/store/playlists'
import { usePlayerStore } from '@/store/player'
import '@/styles/tokens.css'

const app = createApp(App)
const pinia = createPinia()
pinia.use(piniaPluginPersistedstate)
app.use(pinia)
app.use(router)
app.use(i18n)
registerAdapters()

const playlists = usePlaylistsStore(pinia)
const player = usePlayerStore(pinia)

// Setup Bridge (Sync Store <-> Engine)
setupPlayerBridge()

// 使用异步初始化而非顶层 await，避免生产构建报错
;(async () => {
  await playlists.init()
  const tracks = playlists.current?.tracks || []
  if (tracks.length > 0) {
    const idx = player.index >= 0 ? player.index : 0
    const clamped = Math.max(0, Math.min(idx, tracks.length - 1))
    // Initialize Store Queue and load current track into Engine
    await player.setQueue(tracks, clamped)
  }
  app.mount('#app')
})()
