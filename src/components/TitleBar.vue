<template>
  <div class="title-bar">
    <div class="title-bar-drag">
      <div class="app-title">浏览器自动化工具</div>
    </div>

    <div class="window-controls">
      <button class="control-btn minimize" @click="minimize">
        <span>−</span>
      </button>
      <button class="control-btn maximize" @click="maximize">
        <span>{{ isMaximized ? '❐' : '□' }}</span>
      </button>
      <button class="control-btn close" @click="close">
        <span>×</span>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'

const isMaximized = ref(false)

const minimize = () => {
  ;(window as any)?.electronAPI?.minimizeWindow?.()
}

const maximize = () => {
  ;(window as any)?.electronAPI?.maximizeWindow?.()
}

const close = () => {
  ;(window as any)?.electronAPI?.closeWindow?.()
}

const handleWindowStateChange = (event: any, state: string) => {
  isMaximized.value = state === 'maximized'
}

onMounted(() => {
  const api = (window as any)?.electronAPI
  if (api?.onWindowStateChange) {
    const removeListener = api.onWindowStateChange(handleWindowStateChange)
    return removeListener
  }
})
</script>

<style scoped>
.title-bar {
  height: 32px;
  background: #2c3e50;
  display: flex;
  justify-content: space-between;
  align-items: center;
  -webkit-app-region: drag;
  border-bottom: 1px solid #34495e;
}

.title-bar-drag {
  display: flex;
  align-items: center;
  padding-left: 12px;
  flex: 1;
}

.app-title {
  color: #ecf0f1;
  font-size: 12px;
  font-weight: 500;
}

.window-controls {
  display: flex;
  -webkit-app-region: no-drag;
}

.control-btn {
  width: 46px;
  height: 32px;
  border: none;
  background: transparent;
  color: #ecf0f1;
  font-size: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background-color 0.2s;
  cursor: pointer;
}

.control-btn:hover {
  background: rgba(255, 255, 255, 0.1);
}

.control-btn.close:hover {
  background: #e74c3c;
}

.control-btn span {
  margin-top: -2px;
}
</style>
