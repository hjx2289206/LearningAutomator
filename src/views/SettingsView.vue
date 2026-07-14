<template>
  <div class="settings">
    <div class="page-header">
      <h1>系统设置</h1>
      <div class="header-actions">
        <button class="btn btn-ghost" @click="loadConfig">
          <svg class="btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>
          刷新
        </button>
        <button class="btn btn-primary" @click="saveConfig" :disabled="saving">{{ saving ? '保存中...' : '保存设置' }}</button>
        <Transition name="toast-motion">
          <div v-if="toastMsg" class="toast" role="status">
            <span class="toast-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
            </span>
            <span>{{ toastMsg }}</span>
          </div>
        </Transition>
      </div>
    </div>

    <div v-if="loading" class="state-box"><div class="spinner"></div><div>加载中...</div></div>
    <div v-else-if="err" class="state-box error"><div>{{ err }}</div></div>
    <div v-else class="settings-sections">
      <!-- 浏览器配置 -->
      <section class="section">
        <h2>浏览器</h2>
        <div class="field">
          <label>Chrome 路径 (可选)</label>
          <input type="text" v-model="cfg.chrome_path" placeholder="留空使用 Puppeteer 自带 Chromium" />
        </div>
        <div class="field">
          <label>用户数据目录</label>
          <input type="text" v-model="cfg.user_data_dir" placeholder="user_data" />
        </div>
        <div class="field">
          <label>窗口尺寸</label>
          <input type="text" v-model="cfg.window_size" placeholder="1200,800" />
        </div>
        <div class="field">
          <label class="cb-label"><input type="checkbox" v-model="cfg.headless_mode" /> 无头模式</label>
        </div>
      </section>

      <!-- 学习配置 -->
      <section class="section">
        <h2>学习</h2>
        <div class="field">
          <label>登录页面 URL</label>
          <input type="text" v-model="cfg.login_url" />
        </div>
        <div class="field">
          <label>课程页面 URL</label>
          <input type="text" v-model="cfg.course_url" placeholder="https://rsjapp.mianyang.cn/jxjy/pc/wdkc_1646108788000/index.jhtml" />
        </div>
        <div class="field">
          <label>最大尝试次数</label>
          <input type="number" v-model.number="cfg.max_learning_attempts" min="1" />
        </div>
        <div class="field">
          <label>检查间隔 (秒)</label>
          <input type="number" v-model.number="cfg.learning_check_interval" min="1" max="60" />
        </div>
        <div class="field">
          <label>监控间隔 (秒)</label>
          <input type="number" v-model.number="cfg.monitor_interval" min="1" />
        </div>
        <div class="field">
          <label>最大监控时间 (秒)</label>
          <input type="number" v-model.number="cfg.max_monitor_time" min="1" />
        </div>
        <div class="field">
          <label>学习页面关键词 (逗号分隔)</label>
          <input type="text" v-model="learningKeywordsText" />
        </div>
        <div class="field">
          <label>学习 URL 关键词 (逗号分隔)</label>
          <input type="text" v-model="learningUrlKeywordsText" />
        </div>
        <div class="field">
          <label class="cb-label"><input type="checkbox" v-model="cfg.miaoke_enabled" /> 启用秒课</label>
        </div>
        <div class="field">
          <label class="cb-label"><input type="checkbox" v-model="cfg.auto_mute" /> 自动静音 (学习时关闭视频声音)</label>
        </div>
      </section>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed } from 'vue'
import { getConfig, updateConfig } from '@/services/api'

interface Cfg { [key: string]: any }

const cfg = ref<Cfg>({
  chrome_path: '', user_data_dir: 'user_data', window_size: '1200,800', headless_mode: false,
  login_url: 'https://rsjapp.mianyang.cn/jxjy/pc/member/login.jhtml',
  course_url: 'https://rsjapp.mianyang.cn/jxjy/pc/wdkc_1646108788000/index.jhtml',
  max_learning_attempts: 100, learning_check_interval: 10, monitor_interval: 10, max_monitor_time: 3600,
  learning_page_keywords: ['在线学习','学习','课程','视频','jxjy'],
  learning_url_keywords: ['/jxjy/','/pc/'], miaoke_enabled: true, auto_mute: true,
})
const loading = ref(true)
const saving = ref(false)
const err = ref('')
const toastMsg = ref('')
let toastTimer: ReturnType<typeof setTimeout> | null = null

async function loadConfig() {
  try { loading.value = true; err.value = ''
    const c = await getConfig(); if (c) cfg.value = { ...cfg.value, ...c }
  } catch(e: any) { err.value = e.message || '加载失败' } finally { loading.value = false }
}
async function saveConfig() {
  try { saving.value = true; await updateConfig(cfg.value); showToast('设置已保存') } catch(e: any) { err.value = e.message } finally { saving.value = false }
}

const learningKeywordsText = computed({
  get: () => (cfg.value.learning_page_keywords || []).join(','),
  set: (v) => { cfg.value.learning_page_keywords = v.split(',').map((s:string) => s.trim()).filter(Boolean) }
})
const learningUrlKeywordsText = computed({
  get: () => (cfg.value.learning_url_keywords || []).join(','),
  set: (v) => { cfg.value.learning_url_keywords = v.split(',').map((s:string) => s.trim()).filter(Boolean) }
})

function showToast(msg: string) {
  toastMsg.value = msg
  if (toastTimer) clearTimeout(toastTimer)
  toastTimer = setTimeout(() => { toastMsg.value = '' }, 2200)
}

onMounted(loadConfig)
onUnmounted(() => { if (toastTimer) clearTimeout(toastTimer) })
</script>

<style scoped>
.settings { padding: 28px 32px; max-width: 720px; }
.page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; }
.page-header h1 { font-size: 22px; font-weight: 600; color: #e0e0e0; }
.header-actions { display: flex; gap: 8px; }

.state-box { display: flex; flex-direction: column; align-items: center; padding: 40px 0; color: #667; gap: 10px; }
.state-box.error { color: #e74c3c; }
.spinner { width: 28px; height: 28px; border: 3px solid #2a2a4a; border-top-color: #4fc3f7; border-radius: 50%; animation: spin .8s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }

.settings-sections { display: flex; flex-direction: column; gap: 20px; }

.section {
  background: #16163a;
  border: 1px solid #1e1e3a;
  border-radius: 8px;
  padding: 22px;
}
.section h2 { font-size: 15px; font-weight: 600; color: #c0c8e0; margin-bottom: 16px; padding-bottom: 10px; border-bottom: 1px solid #1e1e3a; }

.field { margin-bottom: 14px; }
.field label { display: block; font-size: 12px; color: #8890b0; margin-bottom: 5px; font-weight: 500; }
.field input[type="text"],
.field input[type="number"] {
  width: 100%; padding: 8px 12px; border: 1px solid #2a2a4a; border-radius: 6px;
  background: #1a1a2e; color: #e0e0e0; font-size: 13px; transition: border .15s;
}
.cb-label { display: flex; align-items: center; gap: 8px; cursor: pointer; font-size: 13px; color: #c0c8e0; }
.cb-label input[type="checkbox"] { width: auto; }

.btn { display: inline-flex; align-items: center; gap: 5px; padding: 7px 14px; border: none; border-radius: 6px; font-size: 13px; cursor: pointer; transition: all .15s; font-weight: 500; }
.btn:disabled { opacity: .35; cursor: not-allowed; }
.btn-primary { background: #4fc3f7; color: #1a1a2e; }
.btn-primary:hover:not(:disabled) { filter: brightness(1.1); }
.btn-ghost { background: rgba(255,255,255,.06); color: #8890b0; }
.btn-ghost:hover { background: rgba(255,255,255,.1); color: #c0c8e0; }
.btn-icon { width: 14px; height: 14px; flex-shrink: 0; }
.toast {
  position: fixed; top: 52px; left: 50%; z-index: 9999; min-width: 174px; height: 42px;
  display: flex; align-items: center; justify-content: center; gap: 9px; overflow: hidden;
  padding: 0 20px; border: 1px solid #2f2f34; border-radius: 7px;
  background: #09090b; box-shadow: 0 12px 34px rgba(0, 0, 0, .42), inset 0 1px 0 rgba(255,255,255,.04);
  color: #f4f4f5; font-size: 13px; font-weight: 550; pointer-events: none;
  transform: translateX(-50%);
}
.toast::after {
  content: ''; position: absolute; left: 0; right: 0; bottom: 0; height: 2px;
  background: #66bb6a; transform-origin: left; animation: toast-timer 2.2s linear forwards;
}
.toast-icon {
  width: 20px; height: 20px; display: grid; place-items: center; flex: 0 0 20px;
  border-radius: 50%; background: #66bb6a; color: #071108;
}
.toast-icon svg { width: 12px; height: 12px; }
.toast-motion-enter-active { animation: toast-in .42s cubic-bezier(.18, .9, .25, 1.22); }
.toast-motion-leave-active { animation: toast-out .24s cubic-bezier(.55, 0, 1, .45); }
@keyframes toast-in {
  0% { transform: translateX(-50%) translateY(-32px) scale(.9); }
  68% { transform: translateX(-50%) translateY(3px) scale(1.02); }
  100% { transform: translateX(-50%) translateY(0) scale(1); }
}
@keyframes toast-out {
  0% { transform: translateX(-50%) translateY(0) scale(1); }
  100% { transform: translateX(-50%) translateY(-18px) scale(.95); }
}
@keyframes toast-timer { to { transform: scaleX(0); } }
</style>
