<template>
  <div class="layout" @click.self="exitMultiSelect">
    <SidebarPlaylists class="sidebar" />
    <div class="main-col" @click.self="exitMultiSelect">
      <router-view class="content" @click.self="exitMultiSelect" />
      <ControlBar class="control-bar" />
      <footer class="icp-footer" aria-label="备案信息">
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
body, html { margin: 0; padding: 0; height: 100%; overflow: hidden; font-family: Inter, ui-sans-serif, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }
#app { height: 100%; }
</style>

<style scoped>
.layout { display: flex; height: 100%; overflow: hidden; background: var(--color-surface-muted); }
.sidebar { width: 248px; flex-shrink: 0; background: var(--color-surface); border-right: 1px solid var(--color-border); }
.main-col { flex: 1; display: flex; flex-direction: column; overflow: hidden; }
.content { flex: 1; min-width: 0; overflow-y: auto; padding: 0; background: var(--color-surface); }
.control-bar { flex-shrink: 0; background: var(--color-surface-raised); border-top: 1px solid var(--color-border); z-index: 10; }
.icp-footer { flex-shrink: 0; text-align: center; padding: 4px 8px; font-size: 11px; background: var(--color-surface-muted); border-top: 1px solid var(--color-border); }
.icp-footer a { color: #999; text-decoration: none; }
.icp-footer a:hover { color: #666; }

@media (max-width: 720px) {
  .layout { flex-direction: column; }
  .sidebar { order: 2; width: 100%; height: auto; border-right: 0; border-top: 1px solid var(--color-border); }
  .main-col { order: 1; min-height: 0; }
  .content { padding-bottom: 0; }
  .icp-footer { display: none; }
}
</style>
