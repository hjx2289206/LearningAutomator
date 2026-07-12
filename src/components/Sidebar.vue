<template>
  <div class="sidebar">
    <div class="sidebar-header">
      <span class="logo-icon">⚡</span>
      <span class="logo-text">Learning Automator</span>
    </div>

    <nav class="sidebar-nav">
      <router-link to="/instances" class="nav-item" :class="{ active: $route.path === '/instances' }">
        <svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <rect x="2" y="3" width="20" height="14" rx="2" ry="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/>
        </svg>
        <span class="nav-text">实例管理</span>
      </router-link>

      <router-link to="/settings" class="nav-item" :class="{ active: $route.path === '/settings' }">
        <svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
        </svg>
        <span class="nav-text">系统设置</span>
      </router-link>

      <router-link to="/logs" class="nav-item" :class="{ active: $route.path === '/logs' }">
        <svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/>
        </svg>
        <span class="nav-text">运行日志</span>
      </router-link>
    </nav>

    <div class="sidebar-footer">
      <div class="engine-status" :class="engineOnline ? 'online' : 'offline'">
        <span class="status-dot"></span>
        <span class="status-label">{{ engineOnline ? '引擎就绪' : '引擎离线' }}</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'

const engineOnline = ref(false)

onMounted(() => {
  const api = (window as any).electronAPI
  if (api) {
    api.getConfig().then((r: any) => {
      engineOnline.value = r?.success ?? false
    }).catch(() => {
      engineOnline.value = false
    })
  }
})
</script>

<style scoped>
.sidebar {
  width: 220px;
  height: 100%;
  background: #12122a;
  color: #e0e0e0;
  display: flex;
  flex-direction: column;
  border-right: 1px solid #1e1e3a;
  user-select: none;
}

.sidebar-header {
  padding: 20px 16px;
  display: flex;
  align-items: center;
  gap: 10px;
  border-bottom: 1px solid #1e1e3a;
}

.logo-icon {
  font-size: 20px;
}

.logo-text {
  font-size: 14px;
  font-weight: 600;
  color: #4fc3f7;
  letter-spacing: 0.5px;
}

.sidebar-nav {
  flex: 1;
  padding: 12px 0;
}

.nav-item {
  display: flex;
  align-items: center;
  padding: 10px 16px;
  margin: 2px 8px;
  color: #8890b0;
  text-decoration: none;
  border-radius: 6px;
  transition: all 0.15s ease;
  gap: 10px;
}

.nav-item:hover {
  background: rgba(79, 195, 247, 0.08);
  color: #c0c8e0;
}

.nav-item.active {
  background: rgba(79, 195, 247, 0.12);
  color: #4fc3f7;
}

.nav-icon {
  width: 18px;
  height: 18px;
  flex-shrink: 0;
}

.nav-text {
  font-size: 13px;
  font-weight: 500;
}

.sidebar-footer {
  padding: 16px;
  border-top: 1px solid #1e1e3a;
}

.engine-status {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 11px;
  padding: 8px 12px;
  border-radius: 6px;
  background: rgba(255, 255, 255, 0.03);
}

.engine-status.online {
  color: #66bb6a;
}

.engine-status.offline {
  color: #ffa726;
}

.status-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: currentColor;
}

.status-label {
  font-weight: 500;
}
</style>
