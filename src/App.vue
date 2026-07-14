<template>
  <div class="layout" @click.self="exitMultiSelect">
    <SidebarPlaylists class="sidebar" />
    <div class="main-col" @click.self="exitMultiSelect">
      <router-view class="content" @click.self="exitMultiSelect" />
      <ControlBar class="control-bar" />
    </div>
  </div>
  <ToastContainer />
</template>

<script setup lang="ts">
import { onMounted, onUnmounted } from 'vue'
import { useSelectionStore } from '@/store/selection'
import SidebarPlaylists from '@/components/SidebarPlaylists.vue'
import ControlBar from '@/components/ControlBar.vue'
import ToastContainer from '@/components/ToastContainer.vue'

const selection = useSelectionStore()

function exitMultiSelect() {
  if (selection.isMultiSelectMode) {
    selection.clear()
  }
}

function onKeyDown(e: KeyboardEvent) {
  if (e.key === 'Escape' && selection.isMultiSelectMode) {
    selection.clear()
  }
}

onMounted(() => document.addEventListener('keydown', onKeyDown))
onUnmounted(() => document.removeEventListener('keydown', onKeyDown))
</script>

<style>
/* Global reset for body/html to ensure full height */
body, html { margin: 0; padding: 0; height: 100%; overflow: hidden; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif; }
#app { height: 100%; }
</style>

<style scoped>
.layout { display: flex; height: 100%; overflow: hidden; }
.sidebar { width: 220px; flex-shrink: 0; background: #f7f7f7; border-right: 1px solid #e0e0e0; }
.main-col { flex: 1; display: flex; flex-direction: column; overflow: hidden; }
.content { flex: 1; overflow-y: auto; padding: 0; }
.control-bar { flex-shrink: 0; background: #fff; border-top: 1px solid #e0e0e0; z-index: 10; }
</style>
