import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import SearchBar from '@/components/SearchBar.vue'

describe('SearchBar', () => {
  it('should render input field', () => {
    const wrapper = mount(SearchBar, {
      props: { modelValue: '' }
    })
    const input = wrapper.find('input')
    expect(input.exists()).toBe(true)
    expect(input.attributes('placeholder')).toContain('搜索')
  })

  it('should emit update:modelValue on input', async () => {
    const wrapper = mount(SearchBar, {
      props: { modelValue: '' }
    })
    const input = wrapper.find('input')
    await input.setValue('test')
    expect(wrapper.emitted('update:modelValue')).toBeTruthy()
    const emitted = wrapper.emitted('update:modelValue') as string[][]
    expect(emitted[emitted.length - 1][0]).toBe('test')
  })

  it('should show clear button when has value', () => {
    const wrapper = mount(SearchBar, {
      props: { modelValue: 'test' }
    })
    expect(wrapper.find('.clear-btn').exists()).toBe(true)
  })

  it('should clear on clear button click', async () => {
    const wrapper = mount(SearchBar, {
      props: { modelValue: 'test' }
    })
    await wrapper.find('.clear-btn').trigger('click')
    const emitted = wrapper.emitted('update:modelValue') as string[][]
    expect(emitted[emitted.length - 1][0]).toBe('')
  })

  it('should clear on Escape key', async () => {
    const wrapper = mount(SearchBar, {
      props: { modelValue: 'test' }
    })
    await wrapper.find('input').trigger('keyup.escape')
    const emitted = wrapper.emitted('update:modelValue') as string[][]
    expect(emitted[emitted.length - 1][0]).toBe('')
  })
})
