import { describe, it, expect, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { setActivePinia, createPinia } from 'pinia'
import { createI18n } from 'vue-i18n'
import TrackList from '@/components/TrackList.vue'
import type { Track } from '@/models/track'
import zhCN from '@/locales/zh-CN'

const i18n = createI18n({ legacy: false, locale: 'zh-CN', messages: { 'zh-CN': zhCN } })

function mountWithI18n(component: any, options: any = {}) {
  const { global: userGlobal, ...rest } = options
  return mount(component, {
    global: { plugins: [i18n], ...(userGlobal || {}), stubs: { CoverImage: true, ...(userGlobal?.stubs || {}) } },
    ...rest,
  })
}

function makeTrack(id: string, title: string): Track {
  return { id, uri: `neko://test/track/${id}`, title, sourceId: 'test', sourceRef: {} }
}

describe('TrackList', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('should render track rows', () => {
    const tracks = [makeTrack('1', 'Song A'), makeTrack('2', 'Song B')]
    const wrapper = mountWithI18n(TrackList, {
      props: { tracks, playlistId: 'test' },
    })
    const rows = wrapper.findAll('.row')
    expect(rows).toHaveLength(2)
    expect(rows[0].text()).toContain('Song A')
    expect(rows[1].text()).toContain('Song B')
  })

  it('should show index numbers', () => {
    const tracks = [makeTrack('1', 'Song A'), makeTrack('2', 'Song B')]
    const wrapper = mountWithI18n(TrackList, {
      props: { tracks, playlistId: 'test' },
      global: { stubs: { CoverImage: true } },
    })
    const indexes = wrapper.findAll('.index')
    expect(indexes[0].text()).toBe('1')
    expect(indexes[1].text()).toBe('2')
  })

  it('should handle empty tracks', () => {
    const wrapper = mountWithI18n(TrackList, {
      props: { tracks: [], playlistId: 'test' },
      global: { stubs: { CoverImage: true } },
    })
    expect(wrapper.findAll('.row')).toHaveLength(0)
  })
})
