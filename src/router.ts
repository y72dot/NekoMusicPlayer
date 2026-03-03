import { createRouter, createWebHashHistory, type RouteRecordRaw } from 'vue-router'
import PlayerPage from './pages/PlayerPage.vue'
import PlaylistsPage from './pages/PlaylistsPage.vue'
import ImportPage from './pages/ImportPage.vue'
import LibraryPage from './pages/LibraryPage.vue'

const routes: RouteRecordRaw[] = [
  { path: '/', redirect: '/library' },
  { path: '/player', component: PlayerPage },
  { path: '/library', component: LibraryPage },
  { path: '/playlists', component: PlaylistsPage },
  { path: '/import', component: ImportPage },
]

export default createRouter({
  history: createWebHashHistory(),
  routes,
})