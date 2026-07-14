<template>
  <div class="card">
    <img v-if="track.coverUrl" :src="track.coverUrl" class="cover" />
    <div class="meta">
      <div class="title">{{ track.title }}</div>
      <div class="sub">{{ track.artist || '未知艺术家' }}</div>
    </div>
  </div>
 </template>
 <script setup lang="ts">
 import type { Track } from '@/models/track'
 defineProps<{ track: Track }>()
 </script>
 <style scoped>
 .card { display:flex; gap:12px; align-items:center }
 .cover { width:64px; height:64px; object-fit:cover; border-radius:6px }
 .title { font-weight:600 }
 .sub { color:#666; font-size:12px }
 </style>