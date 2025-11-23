<template>
  <div class="logs-view">
    <div class="page-header">
      <h1>操作日志</h1>
      <div class="header-actions">
        <button class="btn btn-secondary" @click="loadLogs">🔄 刷新</button>
        <button class="btn btn-outline" @click="clearLogs">🗑️ 清空日志</button>
        <button class="btn btn-primary" @click="exportLogs">📤 导出日志</button>
      </div>
    </div>

    <div class="logs-controls">
      <div class="filter-group">
        <label>实例筛选:</label>
        <select v-model="filterBrowserId">
          <option value="">全部实例</option>
          <option v-for="browser in browsers" :key="browser.browser_id" :value="browser.browser_id">
            实例 #{{ browser.browser_id }}
          </option>
        </select>
      </div>

      <div class="filter-group">
        <label>状态筛选:</label>
        <select v-model="filterStatus">
          <option value="">全部状态</option>
          <option value="运行中">运行中</option>
          <option value="刷课中">刷课中</option>
          <option value="等待登录">等待登录</option>
          <option value="已完成">已完成</option>
          <option value="错误">错误</option>
        </select>
      </div>
    </div>

    <div class="logs-container">
      <div
        v-for="log in filteredLogs"
        :key="log.timestamp"
        class="log-item"
        :class="getLogItemClass(log.status)"
      >
        <div class="log-header">
          <span class="log-browser">实例 #{{ log.browser_id }}</span>
          <span class="log-timestamp">{{ formatTime(log.timestamp) }}</span>
        </div>

        <div class="log-content">
          <div class="log-status">{{ log.status }}</div>
          <div class="log-action">{{ log.current_action }}</div>

          <div v-if="log.progress && log.progress.total > 0" class="log-progress">
            <div class="progress-bar">
              <div class="progress-fill" :style="{ width: log.progress.percentage + '%' }"></div>
            </div>
            <span class="progress-text">
              {{ log.progress.current }}/{{ log.progress.total }} ({{ log.progress.percentage }}%)
            </span>
          </div>
        </div>
      </div>

      <div v-if="filteredLogs.length === 0" class="empty-logs">
        <div class="empty-icon">📋</div>
        <div class="empty-text">暂无日志记录</div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { logService, browserService } from '@/services/api'

interface LogEntry {
  browser_id: number
  status: string
  current_action: string
  progress?: {
    current: number
    total: number
    percentage: number
  }
  timestamp: number
}

interface BrowserInstance {
  browser_id: number
  status: string
}

const logs = ref<LogEntry[]>([])
const browsers = ref<BrowserInstance[]>([])
const filterBrowserId = ref('')
const filterStatus = ref('')

const loadLogs = async () => {
  try {
    await logService.init()
    const items = await logService.getLogs()
    logs.value = items.map((log: any) => ({ ...log, timestamp: Date.now() }))
  } catch (error) {
    console.error('加载日志失败:', error)
  }
}

const loadBrowsers = async () => {
  try {
    await browserService.init()
    browsers.value = await browserService.getBrowsers()
  } catch (error) {
    console.error('加载浏览器实例失败:', error)
  }
}

const clearLogs = () => {
  if (confirm('确定要清空所有日志吗？')) {
    logs.value = []
  }
}

const exportLogs = () => {
  alert('导出日志功能待实现')
}

const formatTime = (timestamp: number) => {
  return new Date(timestamp).toLocaleString('zh-CN')
}

const getLogItemClass = (status: string) => {
  const statusMap: { [key: string]: string } = {
    运行中: 'log-running',
    刷课中: 'log-learning',
    等待登录: 'log-waiting',
    已完成: 'log-completed',
    错误: 'log-error',
  }
  return statusMap[status] || 'log-default'
}

const filteredLogs = computed(() => {
  let filtered = logs.value

  if (filterBrowserId.value) {
    filtered = filtered.filter((log) => log.browser_id === parseInt(filterBrowserId.value))
  }

  if (filterStatus.value) {
    filtered = filtered.filter((log) => log.status === filterStatus.value)
  }

  return filtered
})

let refreshInterval: number

onMounted(async () => {
  await loadBrowsers()
  await loadLogs()
  refreshInterval = setInterval(loadLogs, 3000)
})

onUnmounted(() => {
  clearInterval(refreshInterval)
})
</script>

<style scoped>
.logs-view {
  padding: 20px;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 30px;
}

.page-header h1 {
  color: #2c3e50;
  font-size: 24px;
}

.header-actions {
  display: flex;
  gap: 10px;
}

.logs-controls {
  display: flex;
  gap: 20px;
  margin-bottom: 20px;
  padding: 16px;
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
}

.filter-group {
  display: flex;
  align-items: center;
  gap: 10px;
}

.filter-group label {
  font-weight: 500;
  color: #2c3e50;
  white-space: nowrap;
}

.filter-group select {
  padding: 8px 12px;
  border: 1px solid #bdc3c7;
  border-radius: 4px;
  background: white;
  min-width: 120px;
}

.logs-container {
  max-height: 600px;
  overflow-y: auto;
}

.log-item {
  background: white;
  border-radius: 8px;
  padding: 16px;
  margin-bottom: 12px;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.1);
  border-left: 4px solid #bdc3c7;
}

.log-item.log-running {
  border-left-color: #27ae60;
}

.log-item.log-learning {
  border-left-color: #3498db;
}

.log-item.log-waiting {
  border-left-color: #f39c12;
}

.log-item.log-completed {
  border-left-color: #2ecc71;
}

.log-item.log-error {
  border-left-color: #e74c3c;
}

.log-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.log-browser {
  font-weight: 600;
  color: #2c3e50;
  font-size: 14px;
}

.log-timestamp {
  color: #7f8c8d;
  font-size: 12px;
}

.log-content {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.log-status {
  font-weight: 600;
  font-size: 14px;
}

.log-running .log-status {
  color: #27ae60;
}

.log-learning .log-status {
  color: #3498db;
}

.log-waiting .log-status {
  color: #f39c12;
}

.log-completed .log-status {
  color: #2ecc71;
}

.log-error .log-status {
  color: #e74c3c;
}

.log-action {
  color: #2c3e50;
  font-size: 14px;
}

.log-progress {
  margin-top: 8px;
}

.progress-bar {
  width: 100%;
  height: 6px;
  background: #ecf0f1;
  border-radius: 3px;
  overflow: hidden;
  margin-bottom: 4px;
}

.progress-fill {
  height: 100%;
  background: #3498db;
  transition: width 0.3s ease;
}

.progress-text {
  font-size: 12px;
  color: #7f8c8d;
}

.empty-logs {
  padding: 60px 20px;
  text-align: center;
  background: white;
  border-radius: 8px;
  color: #7f8c8d;
}

.empty-icon {
  font-size: 48px;
  margin-bottom: 16px;
}

.empty-text {
  font-size: 16px;
}

.btn {
  padding: 8px 16px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  transition: all 0.3s ease;
}

.btn-primary {
  background: #3498db;
  color: white;
}

.btn-secondary {
  background: #95a5a6;
  color: white;
}

.btn-outline {
  background: transparent;
  border: 1px solid #e74c3c;
  color: #e74c3c;
}

.btn:hover {
  opacity: 0.9;
  transform: translateY(-1px);
}
</style>
