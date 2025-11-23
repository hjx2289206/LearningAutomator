<template>
  <div class="settings-view">
    <div class="page-header">
      <h1>系统设置</h1>
      <div class="header-actions">
        <button class="btn btn-secondary" @click="loadConfig">🔄 刷新</button>
        <button class="btn btn-primary" @click="saveConfig" :disabled="saving">
          {{ saving ? '保存中...' : '💾 保存设置' }}
        </button>
      </div>
    </div>

    <div v-if="loading" class="loading-state">
      <div class="loading-spinner"></div>
      <div>加载配置中...</div>
    </div>

    <div v-else-if="configError" class="error-state">
      <div class="error-icon">⚠️</div>
      <div class="error-message">{{ configError }}</div>
      <button class="btn btn-primary" @click="loadConfig">重试</button>
    </div>

    <div v-else class="settings-container">
      <div class="settings-section">
        <h2>浏览器路径配置</h2>
        <div class="setting-item">
          <label>Chrome 浏览器路径</label>
          <div class="input-group">
            <input
              type="text"
              v-model="config.chrome_path"
              placeholder="C:/Program Files/Google/Chrome/Application/chrome.exe"
            />
            <button class="btn btn-outline" @click="browseChromePath">浏览</button>
          </div>
        </div>

        <div class="setting-item">
          <label>ChromeDriver 路径</label>
          <div class="input-group">
            <input
              type="text"
              v-model="config.chromedriver_path"
              placeholder="./resources/chrome/chromedriver.exe"
            />
            <button class="btn btn-outline" @click="browseDriverPath">浏览</button>
          </div>
        </div>
      </div>

      <div class="settings-section">
        <h2>学习配置</h2>
        <div class="setting-item">
          <label>登录页面URL</label>
          <input
            type="text"
            v-model="config.login_url"
            placeholder="https://rsjapp.mianyang.cn/jxjy/pc/member/login.jhtml"
          />
        </div>

        <div class="setting-item">
          <label>最大学习尝试次数</label>
          <input type="number" v-model="config.max_learning_attempts" min="1" max="1000" />
        </div>

        <div class="setting-item">
          <label class="checkbox-label">
            <input type="checkbox" v-model="config.enable_ai_assistant" />
            启用AI助手
          </label>
        </div>

        <div class="setting-item">
          <label>学习间隔(秒)</label>
          <input type="number" v-model="config.learning_interval" min="1" max="60" />
        </div>
      </div>

      <div class="settings-section">
        <h2>高级配置</h2>
        <div class="setting-item">
          <label class="checkbox-label">
            <input type="checkbox" v-model="config.headless_mode" />
            启用无头模式(不显示浏览器窗口)
          </label>
        </div>

        <div class="setting-item">
          <label class="checkbox-label">
            <input type="checkbox" v-model="config.auto_save_logs" />
            自动保存操作日志到文件
          </label>
        </div>

        <div class="setting-item">
          <label>日志级别</label>
          <select v-model="config.log_level">
            <option value="DEBUG">DEBUG</option>
            <option value="INFO">INFO</option>
            <option value="WARNING">WARNING</option>
            <option value="ERROR">ERROR</option>
          </select>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { configService } from '@/services/api'

interface AppConfig {
  chrome_path: string
  chromedriver_path: string
  login_url: string
  max_learning_attempts: number
  enable_ai_assistant: boolean
  learning_interval: number
  headless_mode: boolean
  auto_save_logs: boolean
  log_level: string
  [key: string]: any // 允许其他配置项
}

const config = ref<AppConfig>({
  chrome_path: '',
  chromedriver_path: '',
  login_url: 'https://rsjapp.mianyang.cn/jxjy/pc/member/login.jhtml',
  max_learning_attempts: 100,
  enable_ai_assistant: true,
  learning_interval: 5,
  headless_mode: false,
  auto_save_logs: true,
  log_level: 'INFO',
})

const loading = ref(true)
const saving = ref(false)
const configError = ref('')

const loadConfig = async () => {
  try {
    loading.value = true
    configError.value = ''
    await configService.init()
    const serverConfig = await configService.getConfig()

    if (serverConfig) {
      // 合并服务器配置和默认配置
      config.value = { ...config.value, ...serverConfig }
    }
  } catch (err) {
    configError.value = err instanceof Error ? err.message : '加载配置失败'
    console.error('加载配置失败:', err)
  } finally {
    loading.value = false
  }
}

const saveConfig = async () => {
  try {
    saving.value = true
    const result = await configService.updateConfig(config.value)

    if (result.success) {
      alert('配置保存成功！')
    } else {
      throw new Error(result.message || '保存配置失败')
    }
  } catch (err) {
    configError.value = err instanceof Error ? err.message : '保存配置失败'
    console.error('保存配置失败:', err)
    alert('保存配置失败')
  } finally {
    saving.value = false
  }
}

const browseChromePath = () => {
  alert('文件浏览功能需要在 Electron 中实现')
}

const browseDriverPath = () => {
  alert('文件浏览功能需要在 Electron 中实现')
}

onMounted(async () => {
  await loadConfig()
})
</script>

<style scoped>
.settings-view {
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

.settings-container {
  max-width: 800px;
}

.settings-section {
  background: white;
  border-radius: 8px;
  padding: 24px;
  margin-bottom: 20px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
}

.settings-section h2 {
  color: #2c3e50;
  font-size: 18px;
  margin-bottom: 20px;
  padding-bottom: 10px;
  border-bottom: 1px solid #ecf0f1;
}

.setting-item {
  margin-bottom: 20px;
}

.setting-item label {
  display: block;
  margin-bottom: 8px;
  font-weight: 500;
  color: #2c3e50;
}

.setting-item input[type='text'],
.setting-item input[type='number'],
.setting-item select {
  width: 100%;
  padding: 10px;
  border: 1px solid #bdc3c7;
  border-radius: 4px;
  font-size: 14px;
  transition: border-color 0.3s ease;
}

.setting-item input:focus,
.setting-item select:focus {
  outline: none;
  border-color: #3498db;
}

.input-group {
  display: flex;
  gap: 10px;
}

.input-group input {
  flex: 1;
}

.checkbox-label {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
}

.checkbox-label input[type='checkbox'] {
  width: auto;
  margin: 0;
}

.btn {
  padding: 10px 20px;
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
  border: 1px solid #3498db;
  color: #3498db;
  white-space: nowrap;
}

.btn:hover {
  opacity: 0.9;
  transform: translateY(-1px);
}
</style>
