<template>
  <div class="layout" @click.self="exitMultiSelect">
    <SidebarPlaylists class="sidebar" />
    <div class="main-col" @click.self="exitMultiSelect">
      <router-view class="content" @click.self="exitMultiSelect" />
      <ControlBar class="control-bar" />
      <footer class="icp-footer">
        <a href="https://beian.miit.gov.cn/" target="_blank" rel="noopener">浙ICP备2026056758号-1</a>
        <img src="https://www.beian.gov.cn/img/ghs.png" style="width:14px;vertical-align:text-bottom;margin-left:8px" />
        <a href="http://www.beian.gov.cn/portal/registerSystemInfo?recordcode=33011002020155" target="_blank" rel="noopener">浙公网安备33011002020155号</a>
      </footer>
    </div>
  </div>
  <ToastContainer />
</template>

<script setup lang="ts">
import { useSelectionStore } from '@/store/selection'
import { useKeyboardShortcuts } from '@/composables/useKeyboardShortcuts'
import SidebarPlaylists from '@/components/SidebarPlaylists.vue'
import ControlBar from '@/components/ControlBar.vue'
import ToastContainer from '@/components/ToastContainer.vue'

const selection = useSelectionStore()

useKeyboardShortcuts()

function exitMultiSelect() {
  if (selection.isMultiSelectMode) {
    selection.clear()
  }
}
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
.icp-footer { flex-shrink: 0; text-align: center; padding: 3px 0; font-size: 12px; background: #f7f7f7; border-top: 1px solid #eee; }
.icp-footer a { color: #999; text-decoration: none; }
.icp-footer a:hover { color: #666; }
</style>
