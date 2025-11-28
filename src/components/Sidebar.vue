<template>
  <div class="sidebar">
    <div class="sidebar-header">
      <h2>自动化工具</h2>
    </div>

    <nav class="sidebar-nav">
      <router-link
        to="/instances"
        class="nav-item"
        :class="{ active: $route.path === '/instances' }"
      >
        <span class="nav-icon">🖥️</span>
        <span class="nav-text">实例管理</span>
      </router-link>

      <router-link to="/settings" class="nav-item" :class="{ active: $route.path === '/settings' }">
        <span class="nav-icon">⚙️</span>
        <span class="nav-text">系统设置</span>
      </router-link>

      <router-link
        to="/question-bank"
        class="nav-item"
        :class="{ active: $route.path === '/question-bank' }"
      >
        <span class="nav-icon">📚</span>
        <span class="nav-text">题库管理</span>
      </router-link>

      <router-link to="/logs" class="nav-item" :class="{ active: $route.path === '/logs' }">
        <span class="nav-icon">📋</span>
        <span class="nav-text">操作日志</span>
      </router-link>
    </nav>

    <div class="sidebar-footer">
      <div class="status-indicator" :class="statusClass">
        {{ statusText }}
      </div>
      <div class="service-info" v-if="healthData">服务版本: v{{ healthData.version }}</div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { healthService } from '@/services/api'

interface HealthData {
  status: string
  service: string
  version: string
}

const statusText = ref('检查后端服务...')
const statusClass = ref('status-offline')
const healthData = ref<HealthData | null>(null)

const checkHealth = async () => {
  try {
    await healthService.init()
    const data = await healthService.checkHealth()
    healthData.value = data

    if (data.status === 'ok') {
      statusText.value = '后端服务正常'
      statusClass.value = 'status-online'
    } else {
      statusText.value = '后端服务异常'
      statusClass.value = 'status-error'
    }
  } catch (error) {
    statusText.value = '后端服务离线'
    statusClass.value = 'status-offline'
    healthData.value = null
  }
}

let healthInterval: number

onMounted(() => {
  checkHealth()
  healthInterval = setInterval(checkHealth, 10000)
})

onUnmounted(() => {
  clearInterval(healthInterval)
})
</script>

<style scoped>
/* 样式保持不变 */
.sidebar {
  width: 240px;
  height: 100vh;
  background: linear-gradient(180deg, #2c3e50 0%, #34495e 100%);
  color: white;
  display: flex;
  flex-direction: column;
  border-right: 1px solid #34495e;
}

.sidebar-header {
  padding: 20px;
  border-bottom: 1px solid #34495e;
}

.sidebar-header h2 {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
}

.sidebar-nav {
  flex: 1;
  padding: 20px 0;
}

.nav-item {
  display: flex;
  align-items: center;
  padding: 12px 20px;
  color: #bdc3c7;
  text-decoration: none;
  transition: all 0.3s ease;
  border-left: 3px solid transparent;
}

.nav-item:hover {
  background: rgba(255, 255, 255, 0.1);
  color: white;
}

.nav-item.active {
  background: rgba(52, 152, 219, 0.2);
  color: #3498db;
  border-left-color: #3498db;
}

.nav-icon {
  font-size: 16px;
  margin-right: 12px;
  width: 20px;
  text-align: center;
}

.nav-text {
  font-size: 14px;
  font-weight: 500;
}

.sidebar-footer {
  padding: 20px;
  border-top: 1px solid #34495e;
}

.status-indicator {
  padding: 8px 12px;
  border-radius: 10px;
  font-size: 12px;
  font-weight: 500;
  text-align: center;
  margin-bottom: 8px;
}

.service-info {
  font-size: 10px;
  color: #bdc3c7;
  text-align: center;
}

.status-online {
  background: rgba(46, 204, 113, 0.2);
  color: #2ecc71;
}

.status-offline {
  background: rgba(149, 165, 166, 0.2);
  color: #95a5a6;
}

.status-error {
  background: rgba(231, 76, 60, 0.2);
  color: #e74c3c;
}
</style>
