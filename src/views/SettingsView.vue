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
        <h2>浏览器配置</h2>
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
        <div class="setting-item">
          <label>用户数据目录</label>
          <input type="text" v-model="config.user_data_dir" placeholder="user_data" />
        </div>
        <div class="setting-item">
          <label>窗口大小</label>
          <input type="text" v-model="config.window_size" placeholder="1200,800" />
        </div>
        <div class="setting-item">
          <label>浏览器超时(秒)</label>
          <input type="number" v-model="config.browser_timeout" min="1" />
        </div>
        <div class="setting-item">
          <label class="checkbox-label"
            ><input type="checkbox" v-model="config.headless_mode" /> 启用无头模式</label
          >
        </div>
        <div class="setting-item">
          <label class="checkbox-label"
            ><input type="checkbox" v-model="config.disable_images" /> 禁用图片加载</label
          >
        </div>
        <div class="setting-item">
          <label class="checkbox-label"
            ><input type="checkbox" v-model="config.disable_javascript" /> 禁用 JavaScript</label
          >
        </div>
        <div class="setting-item">
          <label>User-Agent</label>
          <input type="text" v-model="config.user_agent" />
        </div>
        <div class="setting-item">
          <label>隐式等待(秒)</label>
          <input type="number" v-model="config.implicit_wait" />
        </div>
        <div class="setting-item">
          <label>页面加载超时(秒)</label>
          <input type="number" v-model="config.page_load_timeout" />
        </div>
        <div class="setting-item">
          <label>脚本执行超时(秒)</label>
          <input type="number" v-model="config.script_timeout" />
        </div>
      </div>

      <div class="settings-section">
        <h2>登录与学习配置</h2>
        <div class="setting-item">
          <label>登录页面URL</label>
          <input
            type="text"
            v-model="config.login_url"
            placeholder="https://rsjapp.mianyang.cn/jxjy/pc/member/login.jhtml"
          />
        </div>
        <div class="setting-item">
          <label>登录超时(秒)</label>
          <input type="number" v-model="config.login_timeout" />
        </div>
        <div class="setting-item">
          <label>最大学习尝试次数</label>
          <input type="number" v-model="config.max_learning_attempts" min="1" max="1000" />
        </div>
        <div class="setting-item">
          <label>学习检查间隔(秒)</label>
          <input type="number" v-model="config.learning_check_interval" min="1" max="60" />
        </div>
        <div class="setting-item">
          <label class="checkbox-label"
            ><input type="checkbox" v-model="config.miaoke_enabled" /> 启用秒课</label
          >
        </div>
        <div class="setting-item">
          <label>秒课重试次数</label>
          <input type="number" v-model="config.miaoke_retry_times" min="0" />
        </div>
        <div class="setting-item">
          <label>视频加载超时(秒)</label>
          <input type="number" v-model="config.video_load_timeout" />
        </div>
      </div>

      <div class="settings-section">
        <h2>考试配置</h2>
        <div class="setting-item">
          <label class="checkbox-label"
            ><input type="checkbox" v-model="config.auto_submit_exam" /> 自动提交考试</label
          >
        </div>
        <div class="setting-item">
          <label>答题最小延迟(秒)</label>
          <input type="number" v-model="config.exam_answer_delay_min" />
        </div>
        <div class="setting-item">
          <label>答题最大延迟(秒)</label>
          <input type="number" v-model="config.exam_answer_delay_max" />
        </div>
        <div class="setting-item">
          <label>答题最大尝试次数</label>
          <input type="number" v-model="config.exam_max_attempts" />
        </div>
        <div class="setting-item">
          <label>考试超时(秒)</label>
          <input type="number" v-model="config.exam_timeout" />
        </div>
      </div>

      <div class="settings-section">
        <h2>监控与页面检测</h2>
        <div class="setting-item">
          <label>标签页监控间隔(秒)</label>
          <input type="number" v-model="config.monitor_interval" />
        </div>
        <div class="setting-item">
          <label>最大监控时间(秒)</label>
          <input type="number" v-model="config.max_monitor_time" />
        </div>
        <div class="setting-item">
          <label class="checkbox-label"
            ><input type="checkbox" v-model="config.auto_switch_tab" /> 自动切换标签页</label
          >
        </div>
        <div class="setting-item">
          <label>学习页面关键词(逗号分隔)</label>
          <input type="text" v-model="learningPageKeywordsText" />
        </div>
        <div class="setting-item">
          <label>学习URL关键词(逗号分隔)</label>
          <input type="text" v-model="learningUrlKeywordsText" />
        </div>
        <div class="setting-item">
          <label>考试页面关键词(逗号分隔)</label>
          <input type="text" v-model="examPageKeywordsText" />
        </div>
        <div class="setting-item">
          <label>考试URL关键词(逗号分隔)</label>
          <input type="text" v-model="examUrlKeywordsText" />
        </div>
      </div>

      <div class="settings-section">
        <h2>安全与重试</h2>
        <div class="setting-item">
          <label class="checkbox-label"
            ><input type="checkbox" v-model="config.enable_stealth_mode" /> 启用隐身模式</label
          >
        </div>
        <div class="setting-item">
          <label class="checkbox-label"
            ><input type="checkbox" v-model="config.random_delay" /> 随机延迟</label
          >
        </div>
        <div class="setting-item">
          <label>最大重试次数</label>
          <input type="number" v-model="config.max_retry_count" />
        </div>
      </div>

      <div class="settings-section">
        <h2>日志配置</h2>
        <div class="setting-item">
          <label class="checkbox-label"
            ><input type="checkbox" v-model="config.enable_console_log" /> 控制台日志</label
          >
        </div>
        <div class="setting-item">
          <label class="checkbox-label"
            ><input type="checkbox" v-model="config.enable_file_log" /> 文件日志</label
          >
        </div>
        <div class="setting-item">
          <label>日志文件</label>
          <input type="text" v-model="config.log_file" />
        </div>
        <div class="setting-item">
          <label>日志文件最大大小(MB)</label>
          <input type="number" v-model="config.log_max_size" />
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

      <div class="settings-section">
        <h2>题库设置</h2>
        <div class="setting-item">
          <label class="checkbox-label"
            ><input type="checkbox" v-model="config.enable_question_bank" /> 启用题库</label
          >
        </div>
        <div class="setting-item">
          <label>题库文件路径</label>
          <input type="text" v-model="config.question_bank_file" placeholder="question_bank.json" />
        </div>
        <div class="setting-item">
          <label class="checkbox-label"
            ><input type="checkbox" v-model="config.auto_save_questions" />
            自动保存题目到题库</label
          >
        </div>
      </div>

      <div class="settings-section">
        <h2>AI 设置</h2>
        <div class="setting-item">
          <label class="checkbox-label"
            ><input type="checkbox" v-model="config.enable_ai_assistant" /> 启用AI助手</label
          >
        </div>
        <div class="setting-item">
          <label>API Key</label>
          <input type="text" v-model="config.ai_api_key" />
        </div>
        <div class="setting-item">
          <label>Base URL</label>
          <input type="text" v-model="config.ai_base_url" />
        </div>
        <div class="setting-item">
          <label>模型名称</label>
          <input type="text" v-model="config.ai_model" />
        </div>
        <div class="setting-item">
          <label>温度</label>
          <input type="number" step="0.1" v-model="config.ai_temperature" />
        </div>
        <div class="setting-item">
          <label>最大Tokens</label>
          <input type="number" v-model="config.ai_max_tokens" />
        </div>
        <div class="setting-item">
          <label>请求超时(秒)</label>
          <input type="number" v-model="config.ai_timeout" />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { configService } from '@/services/api'

interface AppConfig {
  chrome_path: string
  chromedriver_path: string
  user_data_dir: string
  login_url: string
  login_timeout: number
  max_learning_attempts: number
  enable_ai_assistant: boolean
  learning_check_interval: number
  miaoke_enabled: boolean
  miaoke_retry_times: number
  video_load_timeout: number
  headless_mode: boolean
  disable_images: boolean
  disable_javascript: boolean
  user_agent: string
  implicit_wait: number
  page_load_timeout: number
  script_timeout: number
  window_size: string
  browser_timeout: number
  log_level: string
  enable_console_log: boolean
  enable_file_log: boolean
  log_file: string
  log_max_size: number
  auto_submit_exam: boolean
  exam_answer_delay_min: number
  exam_answer_delay_max: number
  exam_max_attempts: number
  exam_timeout: number
  monitor_interval: number
  max_monitor_time: number
  auto_switch_tab: boolean
  learning_page_keywords: string[]
  learning_url_keywords: string[]
  exam_page_keywords: string[]
  exam_url_keywords: string[]
  enable_question_bank: boolean
  question_bank_file: string
  auto_save_questions: boolean
  enable_stealth_mode: boolean
  random_delay: boolean
  max_retry_count: number
  [key: string]: any
}

const config = ref<AppConfig>({
  chrome_path: '',
  chromedriver_path: '',
  user_data_dir: 'user_data',
  login_url: 'https://rsjapp.mianyang.cn/jxjy/pc/member/login.jhtml',
  login_timeout: 600,
  max_learning_attempts: 100,
  enable_ai_assistant: true,
  learning_check_interval: 10,
  miaoke_enabled: true,
  miaoke_retry_times: 3,
  video_load_timeout: 60,
  headless_mode: false,
  disable_images: false,
  disable_javascript: false,
  user_agent: '',
  implicit_wait: 5,
  page_load_timeout: 30,
  script_timeout: 10,
  window_size: '1200,800',
  browser_timeout: 30,
  log_level: 'INFO',
  enable_console_log: true,
  enable_file_log: false,
  log_file: 'automation.log',
  log_max_size: 10,
  auto_submit_exam: true,
  exam_answer_delay_min: 2,
  exam_answer_delay_max: 4,
  exam_max_attempts: 3,
  exam_timeout: 300,
  monitor_interval: 10,
  max_monitor_time: 3600,
  auto_switch_tab: true,
  learning_page_keywords: ['在线学习', '学习', '课程', '视频', 'jxjy'],
  learning_url_keywords: ['/jxjy/', '/pc/'],
  exam_page_keywords: ['考试', '测试', '答题', '试卷'],
  exam_url_keywords: ['/exam/', '/test/'],
  enable_question_bank: true,
  question_bank_file: 'question_bank.json',
  auto_save_questions: true,
  enable_stealth_mode: true,
  random_delay: true,
  max_retry_count: 3,
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

const arrToText = (arr: string[]) => arr.join(',')
const textToArr = (text: string) =>
  text
    .split(',')
    .map((s) => s.trim())
    .filter((s) => s.length > 0)

const learningPageKeywordsText = computed({
  get: () => arrToText(config.value.learning_page_keywords || []),
  set: (v: string) => (config.value.learning_page_keywords = textToArr(v)),
})
const learningUrlKeywordsText = computed({
  get: () => arrToText(config.value.learning_url_keywords || []),
  set: (v: string) => (config.value.learning_url_keywords = textToArr(v)),
})
const examPageKeywordsText = computed({
  get: () => arrToText(config.value.exam_page_keywords || []),
  set: (v: string) => (config.value.exam_page_keywords = textToArr(v)),
})
const examUrlKeywordsText = computed({
  get: () => arrToText(config.value.exam_url_keywords || []),
  set: (v: string) => (config.value.exam_url_keywords = textToArr(v)),
})

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
