<template>
  <div v-if="track" class="modal-mask" @click="$emit('close')">
    <div class="modal" @click.stop>
      <div class="modal-header">
        <h3>{{ $t('trackDetail.title') }}</h3>
        <button class="close-btn" @click="$emit('close')">✕</button>
      </div>
      <dl class="detail-list">
        <div v-if="track.title" class="detail-row">
          <dt>{{ $t('trackDetail.titleLabel') }}</dt>
          <dd>{{ track.title }}</dd>
        </div>
        <div v-if="track.artist" class="detail-row">
          <dt>{{ $t('trackDetail.artistLabel') }}</dt>
          <dd>{{ track.artist }}</dd>
        </div>
        <div v-if="track.album" class="detail-row">
          <dt>{{ $t('trackDetail.albumLabel') }}</dt>
          <dd>{{ track.album }}</dd>
        </div>
        <div v-if="track.sourceId" class="detail-row">
          <dt>{{ $t('trackDetail.sourceLabel') }}</dt>
          <dd>{{ sourceName }}</dd>
        </div>
        <div v-if="track.format" class="detail-row">
          <dt>{{ $t('trackDetail.formatLabel') }}</dt>
          <dd>{{ track.format }}</dd>
        </div>
        <div v-if="track.duration" class="detail-row">
          <dt>{{ $t('trackDetail.durationLabel') }}</dt>
          <dd>{{ formatDuration(track.duration) }}</dd>
        </div>
        <div v-if="track.bitrate" class="detail-row">
          <dt>{{ $t('trackDetail.bitrateLabel') }}</dt>
          <dd>{{ formatBitrate(track.bitrate) }}</dd>
        </div>
        <div v-if="track.sampleRate" class="detail-row">
          <dt>{{ $t('trackDetail.sampleRateLabel') }}</dt>
          <dd>{{ formatSampleRate(track.sampleRate) }}</dd>
        </div>
        <div v-if="track.channels != null" class="detail-row">
          <dt>{{ $t('trackDetail.channelsLabel') }}</dt>
          <dd>{{ formatChannels(track.channels) }}</dd>
        </div>
        <div v-if="track.bitDepth" class="detail-row">
          <dt>{{ $t('trackDetail.bitDepthLabel') }}</dt>
          <dd>{{ track.bitDepth }} bits</dd>
        </div>
        <div v-if="track.codec" class="detail-row">
          <dt>{{ $t('trackDetail.codecLabel') }}</dt>
          <dd>{{ track.codec }}</dd>
        </div>
        <div v-if="track.container" class="detail-row">
          <dt>{{ $t('trackDetail.containerLabel') }}</dt>
          <dd>{{ track.container }}</dd>
        </div>
        <div v-if="track.lossless != null" class="detail-row">
          <dt>{{ $t('trackDetail.losslessLabel') }}</dt>
          <dd>{{ track.lossless ? $t('trackDetail.yes') : $t('trackDetail.no') }}</dd>
        </div>
        <div v-if="track.fileSize" class="detail-row">
          <dt>{{ $t('trackDetail.fileSizeLabel') }}</dt>
          <dd>{{ formatFileSize(track.fileSize) }}</dd>
        </div>
      </dl>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { Track } from '@/models/track'

const props = defineProps<{ track: Track | null }>()

defineEmits<{ (e: 'close'): void }>()

const sourceNames: Record<string, string> = {
  fs: 'Local File',
  bilibili: 'Bilibili',
  netease: 'NetEase Cloud Music',
  external: 'External Link',
}

const sourceName = computed(() => {
  if (!props.track) return ''
  return sourceNames[props.track.sourceId] || props.track.sourceId
})

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${m}:${String(s).padStart(2, '0')}`
}

function formatBitrate(bps: number): string {
  if (bps >= 1000000) {
    return `${(bps / 1000000).toFixed(1)} Mbps`
  }
  return `${Math.round(bps / 1000)} kbps`
}

function formatSampleRate(hz: number): string {
  return `${(hz / 1000).toFixed(1)} kHz`
}

function formatChannels(ch: number): string {
  if (ch === 1) return 'Mono (1.0)'
  if (ch === 2) return 'Stereo (2.0)'
  return `${ch} channels`
}

function formatFileSize(bytes: number): string {
  if (bytes >= 1048576) {
    return `${(bytes / 1048576).toFixed(1)} MB`
  }
  return `${(bytes / 1024).toFixed(1)} KB`
}
</script>

<style scoped>
.modal-mask {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 200;
}

.modal {
  background: #fff;
  border-radius: 12px;
  width: 400px;
  max-height: 80vh;
  overflow-y: auto;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  border-bottom: 1px solid #f0f0f0;
}

.modal-header h3 {
  margin: 0;
  font-size: 18px;
}

.close-btn {
  background: none;
  border: none;
  font-size: 18px;
  cursor: pointer;
  color: #888;
  padding: 4px 8px;
  border-radius: 4px;
}

.close-btn:hover {
  background: #f0f0f0;
  color: #333;
}

.detail-list {
  padding: 16px 20px;
  margin: 0;
}

.detail-row {
  display: flex;
  padding: 8px 0;
  border-bottom: 1px solid #f5f5f5;
}

.detail-row:last-child {
  border-bottom: none;
}

.detail-row dt {
  width: 100px;
  flex-shrink: 0;
  color: #888;
  font-size: 14px;
}

.detail-row dd {
  margin: 0;
  font-size: 14px;
  color: #333;
  word-break: break-all;
}
</style>
