<template>
  <div class="app-container">
    <TitleBar />

    <div class="health-banner" :class="healthClass">
      {{ healthText }}
    </div>

    <div class="main-container">
      <Sidebar />
      <div class="content-area">
        <router-view />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import TitleBar from './components/TitleBar.vue'
import Sidebar from './components/Sidebar.vue'
import { healthService } from '@/services/api'

const healthText = ref('正在检查后端服务...')
const healthClass = ref('status-offline')

const checkHealth = async () => {
  try {
    await healthService.init()
    const data = await healthService.checkHealth()
    if (data?.status === 'ok') {
      healthText.value = '后端服务正常'
      healthClass.value = 'status-online'
    } else {
      healthText.value = '后端服务异常'
      healthClass.value = 'status-error'
    }
  } catch (err) {
    healthText.value = '后端服务离线'
    healthClass.value = 'status-offline'
  }
}

let healthInterval: number
onMounted(() => {
  checkHealth()
  healthInterval = setInterval(checkHealth, 15000)
})

onUnmounted(() => {
  clearInterval(healthInterval)
})
</script>

<style>
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
  background: #ecf0f1;
  overflow: hidden;
}

.app-container {
  height: 100vh;
  display: flex;
  flex-direction: column;
}

.main-container {
  flex: 1;
  display: flex;
  overflow: hidden;
}

.content-area {
  flex: 1;
  background: #ecf0f1;
  overflow: auto;
  padding: 20px;
}

.health-banner {
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: 500;
  border-bottom: 1px solid #dfe6e9;
}

.status-online {
  background: rgba(46, 204, 113, 0.12);
  color: #2ecc71;
}

.status-offline {
  background: rgba(149, 165, 166, 0.12);
  color: #95a5a6;
}

.status-error {
  background: rgba(231, 76, 60, 0.12);
  color: #e74c3c;
}
</style>
