import { ref, computed, type Ref } from 'vue'
import type { Track } from '@/models/track'

export function useTrackFilter(tracksSource: Ref<Track[]>) {
  const query = ref('')

  const filtered = computed(() => {
    const q = query.value.trim().toLowerCase()
    if (!q) return tracksSource.value

    return tracksSource.value.filter(t => {
      return (
        t.title.toLowerCase().includes(q) ||
        (t.artist && t.artist.toLowerCase().includes(q)) ||
        (t.album && t.album.toLowerCase().includes(q))
      )
    })
  })

  function clearQuery() {
    query.value = ''
  }

  return { query, filtered, clearQuery }
}
