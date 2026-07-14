import { ref, watch, type Ref } from 'vue'
import { UriResolver } from '@/core/uriResolver'

const cache = new Map<string, string>()

export function useCoverUrl(coverUri: Ref<string | undefined>) {
  const blobUrl = ref<string>()

  async function resolve(uri: string) {
    if (cache.has(uri)) {
      blobUrl.value = cache.get(uri)
      return
    }
    try {
      const result = await UriResolver.load(uri)
      if (result.url instanceof Blob) {
        const url = URL.createObjectURL(result.url)
        cache.set(uri, url)
        blobUrl.value = url
      } else if (typeof result.url === 'string') {
        blobUrl.value = result.url
      }
    } catch {
      blobUrl.value = undefined
    }
  }

  watch(coverUri, (uri) => {
    if (uri) {
      resolve(uri)
    } else {
      blobUrl.value = undefined
    }
  }, { immediate: true })

  return { blobUrl }
}
