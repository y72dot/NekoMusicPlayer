<template>
  <div class="card">
    <CoverImage :coverUrl="track.coverUrl" :size="64" />
    <div class="meta">
      <div class="title">{{ track.title }}</div>
      <div class="sub">{{ track.artist || $t('track.unknownArtist') }}</div>
    </div>
  </div>
</template>
<script setup lang="ts">
import type { Track } from '@/models/track'
import CoverImage from '@/components/CoverImage.vue'
defineProps<{ track: Track }>()
</script>
<style scoped>
.card { display:flex; gap:12px; align-items:center }
.title { font-weight:600 }
.sub { color:#666; font-size:12px }
</style>