<template>
  <div class="title-bar">
    <div class="title-bar-drag">
      <div class="app-title">Learning Automator</div>
    </div>
    <div class="window-controls">
      <button class="control-btn" @click="minimize" title="最小化">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="5" y1="12" x2="19" y2="12"/></svg>
      </button>
      <button class="control-btn" @click="maximize" title="最大化">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="4" y="4" width="16" height="16" rx="1"/></svg>
      </button>
      <button class="control-btn close-btn" @click="closeWindow" title="关闭">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
const api = (window as any).electronAPI

const minimize = () => api?.minimizeWindow?.()
const maximize = () => api?.maximizeWindow?.()
const closeWindow = () => api?.closeWindow?.()
</script>

<style scoped>
.title-bar {
  height: 36px;
  background: #0f0f1a;
  display: flex;
  justify-content: space-between;
  align-items: center;
  -webkit-app-region: drag;
  border-bottom: 1px solid #1e1e3a;
}

.title-bar-drag {
  display: flex;
  align-items: center;
  padding-left: 14px;
  flex: 1;
}

.app-title {
  color: #8890b0;
  font-size: 11px;
  font-weight: 500;
  letter-spacing: 0.5px;
}

.window-controls {
  display: flex;
  -webkit-app-region: no-drag;
}

.control-btn {
  width: 44px;
  height: 36px;
  border: none;
  background: transparent;
  color: #8890b0;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: background 0.15s;
}

.control-btn svg {
  width: 14px;
  height: 14px;
}

.control-btn:hover {
  background: rgba(255, 255, 255, 0.07);
  color: #e0e0e0;
}

.close-btn:hover {
  background: #e74c3c;
  color: #fff;
}
</style>
