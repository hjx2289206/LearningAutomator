<template>
  <div class="instance-management">
    <div class="page-header">
      <h1>浏览器实例管理</h1>
      <div class="header-actions">
        <button class="btn btn-primary" @click="createBrowser">+ 创建新实例</button>
        <button class="btn btn-secondary" @click="stopAllBrowsers">⏹️ 停止所有实例</button>
        <button class="btn btn-outline" @click="() => { void loadBrowsers() }">🔄 刷新</button>
      </div>
    </div>

    <div v-if="loading" class="loading-state">
      <div class="loading-spinner"></div>
      <div>加载中...</div>
    </div>

    <div v-else-if="error" class="error-state">
      <div class="error-icon">⚠️</div>
      <div class="error-message">{{ error }}</div>
      <button class="btn btn-primary" @click="() => { void loadBrowsers() }">重试</button>
    </div>

    <div v-else class="instances-grid">
      <div v-for="browser in browsers" :key="browser.browser_id" class="instance-card">
        <div class="instance-header">
          <h3>实例 #{{ browser.browser_id }}</h3>
          <span class="status-badge" :class="getStatusClass(browser.status)">
            {{ browser.status }}
          </span>
        </div>

        <div class="instance-info">
          <p class="action-text">{{ browser.current_action }}</p>
          <div class="progress-section" v-if="browser.progress && browser.progress.total > 0">
            <div class="progress-bar">
              <div
                class="progress-fill"
                :style="{ width: browser.progress.percentage + '%' }"
              ></div>
            </div>
            <span class="progress-text">
              {{ browser.progress.current }}/{{ browser.progress.total }} ({{
                browser.progress.percentage
              }}%)
            </span>
          </div>
          <div class="url-text" v-if="browser.current_url">
            {{ browser.current_url }}
          </div>
        </div>

        <div class="instance-actions">
          <button
            class="btn btn-small btn-success"
            @click="startBrowser(browser.browser_id)"
            :disabled="browser.status === '运行中' || browser.status === '刷课中'"
          >
            ▶️ 启动
          </button>
          <button
            class="btn btn-small btn-warning"
            @click="stopBrowser(browser.browser_id)"
            :disabled="browser.status === '已停止' || browser.status === '等待登录'"
          >
            ⏹️ 停止
          </button>
          <button
            class="btn btn-small btn-danger"
            @click="removeBrowser(browser.browser_id)"
            :disabled="browser.status === '运行中' || browser.status === '刷课中'"
          >
            🗑️ 移除
          </button>
        </div>
      </div>

      <div v-if="browsers.length === 0" class="empty-state">
        <div class="empty-icon">🖥️</div>
        <div class="empty-text">暂无浏览器实例</div>
        <button class="btn btn-primary" @click="createBrowser">创建第一个实例</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { browserService } from '@/services/api'

interface BrowserInstance {
  browser_id: number
  status: string
  current_action: string
  progress?: {
    current: number
    total: number
    percentage: number
  }
  current_url?: string
  title?: string
}

const browsers = ref<BrowserInstance[]>([])
const loading = ref(true)
const error = ref('')
const hasLoadedOnce = ref(false)

const loadBrowsers = async (initial = false) => {
  try {
    if (initial) {
      loading.value = true
      error.value = ''
    }
    await browserService.init()
    const list = await browserService.getBrowsers()
    browsers.value = list
    hasLoadedOnce.value = true
  } catch (err) {
    // 初次加载失败才进入错误页；刷新失败仅记录日志，避免界面闪烁
    if (!hasLoadedOnce.value) {
      error.value = err instanceof Error ? err.message : '加载实例失败'
    }
    console.warn('刷新浏览器实例失败:', err)
  } finally {
    if (initial) {
      loading.value = false
    }
  }
}

const createBrowser = async () => {
  try {
    await browserService.createBrowser()
    await loadBrowsers()
  } catch (err) {
    error.value = '创建浏览器实例失败'
    console.error('创建浏览器实例失败:', err)
  }
}

const startBrowser = async (browserId: number) => {
  try {
    await browserService.startBrowser(browserId)
    // 不立即重新加载，等待状态自动更新
  } catch (err) {
    error.value = '启动浏览器失败'
    console.error('启动浏览器失败:', err)
  }
}

const stopBrowser = async (browserId: number) => {
  try {
    await browserService.stopBrowser(browserId)
    // 不立即重新加载，等待状态自动更新
  } catch (err) {
    error.value = '停止浏览器失败'
    console.error('停止浏览器失败:', err)
  }
}

const removeBrowser = async (browserId: number) => {
  if (!confirm('确定要移除这个浏览器实例吗？')) return

  try {
    await browserService.removeBrowser(browserId)
    await loadBrowsers()
  } catch (err) {
    error.value = '移除浏览器失败'
    console.error('移除浏览器失败:', err)
  }
}

const stopAllBrowsers = async () => {
  if (!confirm('确定要停止所有浏览器实例吗？')) return

  try {
    await browserService.stopAllBrowsers()
    // 不立即重新加载，等待状态自动更新
  } catch (err) {
    error.value = '停止所有浏览器失败'
    console.error('停止所有浏览器失败:', err)
  }
}

const getStatusClass = (status: string) => {
  const statusMap: { [key: string]: string } = {
    运行中: 'status-running',
    刷课中: 'status-learning',
    等待登录: 'status-waiting',
    已停止: 'status-stopped',
    错误: 'status-error',
  }
  return statusMap[status] || 'status-default'
}

let refreshInterval: number

onMounted(async () => {
  console.log('🔄 实例管理页面加载，测试后端连接...')

  // 测试后端连接
  try {
    let port = 3001
    try {
      const p = await (window as any)?.electronAPI?.getBackendPort?.()
      port = p ?? 3001
    } catch (e) {
      port = 3001
    }
    console.log('📡 获取到的后端端口:', port)

    const response = await fetch(`http://localhost:${port}/api/health`)
    const data = await response.json()
    console.log('✅ 后端连接测试成功:', data)
  } catch (error) {
    console.error('❌ 后端连接测试失败:', error)
  }

  await loadBrowsers(true)
  refreshInterval = setInterval(() => loadBrowsers(false), 3000)
})

onUnmounted(() => {
  clearInterval(refreshInterval)
})
</script>

<style scoped>
.loading-state,
.error-state,
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 20px;
  text-align: center;
}

.loading-spinner {
  width: 40px;
  height: 40px;
  border: 4px solid #f3f3f3;
  border-top: 4px solid #3498db;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-bottom: 16px;
}

@keyframes spin {
  0% {
    transform: rotate(0deg);
  }
  100% {
    transform: rotate(360deg);
  }
}

.error-icon,
.empty-icon {
  font-size: 48px;
  margin-bottom: 16px;
}

.error-message,
.empty-text {
  font-size: 16px;
  margin-bottom: 20px;
  color: #7f8c8d;
}

.error-message {
  color: #e74c3c;
}

.url-text {
  font-size: 12px;
  color: #7f8c8d;
  margin-top: 8px;
  word-break: break-all;
}

.instance-management {
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

.instances-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 20px;
}

.instance-card {
  background: white;
  border-radius: 8px;
  padding: 20px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
  border-left: 4px solid #3498db;
}

.instance-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 15px;
}

.instance-header h3 {
  color: #2c3e50;
  font-size: 16px;
}

.status-badge {
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 500;
}

.status-running {
  background: #d4edda;
  color: #155724;
}

.status-waiting {
  background: #fff3cd;
  color: #856404;
}

.status-learning {
  background: #cce7ff;
  color: #004085;
}

.status-stopped {
  background: #f8f9fa;
  color: #6c757d;
}

.status-error {
  background: #f8d7da;
  color: #721c24;
}

.instance-info {
  margin-bottom: 15px;
}

.action-text {
  color: #666;
  font-size: 14px;
  margin-bottom: 10px;
}

.progress-section {
  margin-top: 10px;
}

.progress-bar {
  width: 100%;
  height: 6px;
  background: #ecf0f1;
  border-radius: 3px;
  overflow: hidden;
  margin-bottom: 5px;
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

.instance-actions {
  display: flex;
  gap: 8px;
}

.btn {
  padding: 8px 16px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  transition: all 0.3s ease;
}

.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-small {
  padding: 6px 12px;
  font-size: 12px;
}

.btn-primary {
  background: #3498db;
  color: white;
}

.btn-secondary {
  background: #95a5a6;
  color: white;
}

.btn-success {
  background: #27ae60;
  color: white;
}

.btn-warning {
  background: #f39c12;
  color: white;
}

.btn-danger {
  background: #e74c3c;
  color: white;
}

.btn:hover:not(:disabled) {
  opacity: 0.9;
  transform: translateY(-1px);
}
</style>
