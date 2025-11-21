import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router'
import { registerAdapters } from './adapters/register'
import { playerEngine } from './core/playerEngine'
import { usePlaylistsStore } from './store/playlists'

const app = createApp(App)
const pinia = createPinia()
app.use(pinia)
app.use(router)
registerAdapters()
playerEngine.init()
const playlists = usePlaylistsStore(pinia)
// 使用异步初始化而非顶层 await，避免生产构建报错
;(async () => {
  await playlists.init()
  app.mount('#app')
})()