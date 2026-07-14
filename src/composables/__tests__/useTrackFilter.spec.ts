import { describe, it, expect } from 'vitest'
import { ref } from 'vue'
import { useTrackFilter } from '@/composables/useTrackFilter'
import type { Track } from '@/models/track'

function makeTrack(id: string, title: string, artist?: string, album?: string): Track {
  return { id, uri: `neko://test/track/${id}`, title, artist, album, sourceId: 'test', sourceRef: {} }
}

describe('useTrackFilter', () => {
  const tracks = [
    makeTrack('1', '晴天', '周杰伦', '叶惠美'),
    makeTrack('2', '七里香', '周杰伦', '七里香'),
    makeTrack('3', 'Love Story', 'Taylor Swift', 'Fearless'),
    makeTrack('4', 'Hello', 'Adele', '25'),
  ]

  it('should return all tracks when query is empty', () => {
    const source = ref(tracks)
    const { filtered } = useTrackFilter(source)
    expect(filtered.value).toHaveLength(4)
  })

  it('should filter by title', () => {
    const source = ref(tracks)
    const { query, filtered } = useTrackFilter(source)
    query.value = '晴天'
    expect(filtered.value).toHaveLength(1)
    expect(filtered.value[0].id).toBe('1')
  })

  it('should filter by artist (case insensitive)', () => {
    const source = ref(tracks)
    const { query, filtered } = useTrackFilter(source)
    query.value = 'taylor'
    expect(filtered.value).toHaveLength(1)
    expect(filtered.value[0].id).toBe('3')
  })

  it('should filter by album', () => {
    const source = ref(tracks)
    const { query, filtered } = useTrackFilter(source)
    query.value = '叶惠美'
    expect(filtered.value).toHaveLength(1)
    expect(filtered.value[0].id).toBe('1')
  })

  it('should clear query', () => {
    const source = ref(tracks)
    const { query, filtered, clearQuery } = useTrackFilter(source)
    query.value = 'test'
    clearQuery()
    expect(query.value).toBe('')
    expect(filtered.value).toHaveLength(4)
  })
})
