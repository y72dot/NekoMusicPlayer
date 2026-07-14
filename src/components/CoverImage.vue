<template>
  <div class="cover-wrapper" :style="wrapperStyle">
    <img v-if="resolvedUrl" :src="resolvedUrl" class="cover" :style="imageStyle" />
    <div v-else class="placeholder" :style="imageStyle">🎵</div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch, onMounted } from 'vue'
import { UriResolver } from '@/core/uriResolver'

const props = withDefaults(defineProps<{ coverUrl?: string; size?: number }>(), { size: 40 })

const resolvedUrl = ref<string>()

const px = computed(() => `${props.size}px`)
const wrapperStyle = computed(() => ({ width: px.value, height: px.value }))
const imageStyle = computed(() => ({ width: px.value, height: px.value }))

async function resolve(uri: string) {
  if (!uri) return
  if (uri.startsWith('blob:') || uri.startsWith('http')) {
    resolvedUrl.value = uri
    return
  }
  try {
    const result = await UriResolver.load(uri)
    if (result.url instanceof Blob) {
      resolvedUrl.value = URL.createObjectURL(result.url)
    } else if (typeof result.url === 'string') {
      resolvedUrl.value = result.url
    }
  } catch {
    resolvedUrl.value = undefined
  }
}

onMounted(() => {
  if (props.coverUrl) resolve(props.coverUrl)
})

watch(() => props.coverUrl, (uri) => {
  if (uri) resolve(uri)
  else resolvedUrl.value = undefined
})
</script>

<style scoped>
.cover-wrapper {
  flex-shrink: 0;
}

.cover {
  object-fit: cover;
  border-radius: 4px;
}

.placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f0f0f0;
  border-radius: 4px;
  font-size: 18px;
}
</style>
