import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router'
import { registerAdapters } from './adapters/register'
import { playerEngine } from './core/playerEngine'
import { usePlaylistsStore } from './store/playlists'
import { usePlayerStore } from './store/player'

const app = createApp(App)
const pinia = createPinia()
app.use(pinia)
app.use(router)
registerAdapters()
playerEngine.init()
const playlists = usePlaylistsStore(pinia)
const player = usePlayerStore(pinia)
// 使用异步初始化而非顶层 await，避免生产构建报错
;(async () => {
  await playlists.init()
  const tracks = playlists.current?.tracks || []
  if (tracks.length > 0) {
    const idx = player.index >= 0 ? player.index : 0
    const clamped = Math.max(0, Math.min(idx, tracks.length - 1))
    await playerEngine.loadQueue(tracks, clamped)
  }
  app.mount('#app')
})()