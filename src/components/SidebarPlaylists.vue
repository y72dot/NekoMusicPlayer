<template>
  <aside class="side" :aria-label="$t('nav.main')">
    <div class="brand" aria-hidden="true"><span class="brand-mark">N</span><span>NekoMusic</span></div>
    <nav class="nav" :aria-label="$t('nav.main')">
      <router-link to="/library" class="nav-item" active-class="active"><span aria-hidden="true">♫</span><span>{{ $t('nav.allSongs') }}</span></router-link>
      <router-link to="/player" class="nav-item" active-class="active"><span aria-hidden="true">▶</span><span>{{ $t('nav.nowPlaying') }}</span></router-link>
      <router-link to="/import" class="nav-item" active-class="active"><span aria-hidden="true">＋</span><span>{{ $t('nav.importMusic') }}</span></router-link>
      <router-link to="/settings" class="nav-item" active-class="active"><span aria-hidden="true">⚙</span><span>{{ $t('nav.settings') }}</span></router-link>
    </nav>
    <div class="sep"></div>
    <div class="top playlist-heading">
      <strong>{{ $t('playlist.title') }}</strong>
      <button @click="create">{{ $t('playlist.new') }}</button>
    </div>
    <ul>
      <li v-for="p in playlists.playlists" :key="p.id" 
          :class="{active: p.id === currentId}" 
          @click="openPlaylist(p.id)">
        {{ p.name }}
      </li>
    </ul>
  </aside>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { usePlaylistsStore } from '@/store/playlists'

const router = useRouter()
const route = useRoute()
const playlists = usePlaylistsStore()

const currentId = computed(() => route.params.id as string)

async function create() {
  const name = prompt('歌单名称') || '新建歌单'
  await playlists.create(name)
  // After create, currentId is updated in store, navigate to it
  if (playlists.currentId) {
    router.push(`/playlist/${playlists.currentId}`)
  }
}

function openPlaylist(id: string) {
  router.push(`/playlist/${id}`)
}
</script>

<style scoped>
.side { width:100%; height:100%; padding:16px 12px; display:flex; flex-direction:column; gap:10px; overflow:hidden; }
.brand { display:flex; align-items:center; gap:10px; padding:4px 8px 14px; font-weight:750; letter-spacing:-0.02em; }
.brand-mark { display:grid; place-items:center; width:32px; height:32px; border-radius:10px; color:#fff; background:linear-gradient(135deg,var(--color-primary),#9e74ff); box-shadow:var(--shadow-sm); }
.top { display:flex; justify-content:space-between; align-items:center }
ul { list-style:none; padding:0; margin:0; overflow-y:auto; }
li { padding:9px 10px; border-radius:var(--radius-sm); cursor:pointer }
li:hover { background: var(--color-surface-muted); }
li.active { background:var(--color-primary-soft); color:var(--color-primary-strong); font-weight: 650; }
.nav { display:flex; flex-direction:column; gap:4px }
.nav-item { min-height:44px; display:flex; align-items:center; gap:11px; padding:10px 12px; text-decoration:none; color:var(--color-text-muted); border-radius:var(--radius-sm) }
.nav-item > span:first-child { width:20px; text-align:center; font-size:17px; }
.nav-item:hover { background:var(--color-surface-muted); color:var(--color-text); }
.nav-item.active { background:var(--color-primary-soft); color:var(--color-primary-strong); font-weight:700 }
.sep { height:1px; background:var(--color-border); margin:8px 0 }
.top button { border:1px solid var(--color-border); background:var(--color-surface); color:var(--color-primary-strong); padding:4px 10px; cursor:pointer; }

@media (max-width:720px) {
  .side { padding:6px max(8px, env(safe-area-inset-right)) calc(6px + env(safe-area-inset-bottom)) max(8px, env(safe-area-inset-left)); overflow:visible; }
  .brand, .sep, .playlist-heading, ul { display:none; }
  .nav { flex-direction:row; justify-content:space-around; gap:2px; }
  .nav-item { flex:1; min-width:0; flex-direction:column; justify-content:center; gap:1px; padding:5px 2px; font-size:11px; }
  .nav-item > span:first-child { font-size:16px; }
}
</style>
