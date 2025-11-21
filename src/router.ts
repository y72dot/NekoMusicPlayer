import { createRouter, createWebHashHistory, type RouteRecordRaw } from 'vue-router'
import PlayerPage from './pages/PlayerPage.vue'
import PlaylistsPage from './pages/PlaylistsPage.vue'
import ImportPage from './pages/ImportPage.vue'

const routes: RouteRecordRaw[] = [
  { path: '/', redirect: '/player' },
  { path: '/player', component: PlayerPage },
  { path: '/playlists', component: PlaylistsPage },
  { path: '/import', component: ImportPage },
]

export default createRouter({
  history: createWebHashHistory(),
  routes,
})