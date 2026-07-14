<template>
  <div class="instance-mgmt">
    <div class="page-header">
      <h1>实例管理</h1>
      <div class="header-actions">
        <button class="btn btn-primary" @click="createBrowser">+ 新建实例</button>
        <button class="btn btn-ghost" @click="stopAll">停止全部</button>
        <button class="btn btn-ghost" @click="loadBrowsers">
          <svg class="btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>
          刷新
        </button>
      </div>
    </div>

    <div v-if="loading" class="state-box">
      <div class="spinner"></div>
      <div>加载中...</div>
    </div>

    <div v-else-if="error" class="state-box error">
      <div class="state-icon">!</div>
      <div>{{ error }}</div>
      <button class="btn btn-primary" @click="loadBrowsers">重试</button>
    </div>

    <div v-else class="instances-grid">
      <div v-for="b in browsers" :key="b.browser_id" class="instance-card" :class="cardClass(b.status)">
        <div class="card-header">
                      <span v-if="editingNameId !== b.browser_id" class="instance-name-row" @click="startRename(b.browser_id)" title="点击改名">
              <span class="instance-id">{{ b.name || '实例 #' + b.browser_id }}</span><span v-if="b.real_name" class="real-name">{{ b.real_name }}</span>
              <svg class="edit-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
            </span>
            <input v-else class="rename-input" v-model="renameValue" @keyup.enter="commitRename(b.browser_id)" @keyup.escape="cancelRename" @blur="commitRename(b.browser_id)" />
          <span class="status-chip" :class="statusClass(b.status)">{{ b.status }}</span>
        </div>

        <div class="card-body">
          <p class="action-text">{{ b.current_action }}</p>
          <div v-if="b.progress && b.progress.total > 0" class="progress-block">
            <div class="progress-header">
              <span class="progress-label">{{ b.progress.current }}/{{ b.progress.total }} ({{ b.progress.percentage }}%)</span>
              <span v-if="b.progress.eta" class="eta-text">{{ b.progress.eta }}</span>
            </div>
            <div class="progress-track">
              <div class="progress-fill" :style="{ width: b.progress.percentage + '%' }"></div>
            </div>
          </div>
          <div v-if="b.current_url" class="url-text">{{ b.current_url }}</div>
        </div>

        <div class="card-actions">
          <button class="btn btn-sm btn-success" @click="start(b.browser_id)" :disabled="b.status === '运行中' || b.status === '刷课中'">
            <svg class="btn-icon" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg>
            启动
          </button>
          <button class="btn btn-sm btn-warning" @click="stop(b.browser_id)" :disabled="b.status === '已停止' || b.status === '等待登录'">
            <svg class="btn-icon" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>
            停止
          </button>
          <button class="btn btn-sm btn-danger" @click="remove(b.browser_id)" :disabled="b.status === '运行中' || b.status === '刷课中'">
            <svg class="btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
            移除
          </button>
        </div>
      </div>

      <div v-if="browsers.length === 0" class="state-box">
        <svg class="empty-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
          <rect x="2" y="3" width="20" height="14" rx="2" ry="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/>
        </svg>
        <div class="empty-label">暂无浏览器实例</div>
        <button class="btn btn-primary" @click="createBrowser">创建第一个实例</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { getBrowsers, createBrowser as apiCreate, startBrowser, stopBrowser, removeBrowser, stopAllBrowsers, renameBrowser } from '@/services/api'

interface BrowserInst {
  browser_id: number; name?: string | null; real_name?: string | null; status: string; current_action: string
  progress?: { current: number; total: number; percentage: number; eta?: string | null; eta_seconds?: number | null }
  current_url?: string; title?: string
}

const browsers = ref<BrowserInst[]>([])
const loading = ref(true)
const error = ref('')
const editingNameId = ref<number | null>(null)
const renameValue = ref("")
let hasLoaded = false
let interval: ReturnType<typeof setInterval>

async function loadBrowsers(init = false) {
  try {
    if (init) { loading.value = true; error.value = '' }
    browsers.value = await getBrowsers()
    hasLoaded = true
  } catch (e: any) {
    if (!hasLoaded) error.value = e.message || '加载失败'
    console.warn('刷新失败:', e)
  } finally {
    if (init) loading.value = false
  }
}

async function createBrowser() {
  try { await apiCreate(); await loadBrowsers() } catch (e) { console.error(e) }
}

async function start(id: number) {
  try { await startBrowser(id) } catch (e) { console.error(e) }
}

async function stop(id: number) {
  try { await stopBrowser(id) } catch (e) { console.error(e) }
}

async function remove(id: number) {
  if (!confirm('确定要移除这个实例吗？')) return
  try { await removeBrowser(id); await loadBrowsers() } catch (e) { console.error(e) }
}

async function startRename(id: number) {
  const browser = browsers.value.find(b => b.browser_id === id)
  if (!browser) return
  editingNameId.value = id
  renameValue.value = browser.name || ""
}

async function commitRename(id: number) {
  const newName = renameValue.value.trim()
  if (newName && editingNameId.value === id) {
    await renameBrowser(id, newName || ("实例 #" + id))
    const browser = browsers.value.find(b => b.browser_id === id)
    if (browser) browser.name = newName || ("实例 #" + id)
  }
  editingNameId.value = null
}

function cancelRename() {
  editingNameId.value = null
}

async function stopAll() {
  if (!confirm('确定停止所有实例？')) return
  try { await stopAllBrowsers() } catch (e) { console.error(e) }
}

function statusClass(s: string) {
  const m: Record<string, string> = {
    '运行中': 's-running', '刷课中': 's-learning', '等待登录': 's-waiting',
    '已停止': 's-stopped', '错误': 's-error',
  }
  return m[s] || 's-default'
}

function cardClass(s: string) {
  const m: Record<string, string> = {
    '运行中': 'border-green', '刷课中': 'border-blue', '等待登录': 'border-amber',
    '已停止': 'border-slate', '错误': 'border-red',
  }
  return m[s] || 'border-slate'
}

onMounted(() => { loadBrowsers(true); interval = setInterval(() => loadBrowsers(), 3000) })
onUnmounted(() => clearInterval(interval))
</script>

<style scoped>
.instance-mgmt { padding: 28px 32px; max-width: 1200px; }
.page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; }
.page-header h1 { font-size: 22px; font-weight: 600; color: #e0e0e0; }
.header-actions { display: flex; gap: 8px; }

.state-box { display: flex; flex-direction: column; align-items: center; padding: 60px 0; color: #667; gap: 12px; }
.state-box.error { color: #e74c3c; }
.state-icon { width: 40px; height: 40px; border-radius: 50%; border: 2px solid #e74c3c; display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 18px; }
.empty-icon { width: 48px; height: 48px; color: #3a3a5a; }
.empty-label { color: #667; }

.spinner { width: 28px; height: 28px; border: 3px solid #2a2a4a; border-top-color: #4fc3f7; border-radius: 50%; animation: spin .8s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }

.instances-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 16px; }

.instance-card {
  background: #16163a;
  border-radius: 8px;
  border: 1px solid #1e1e3a;
  border-left: 4px solid #3a3a5a;
  padding: 18px;
  transition: border-color 0.2s;
}
.instance-card:hover { border-color: #2a2a5a; }
.instance-card.border-green { border-left-color: #66bb6a; }
.instance-card.border-blue { border-left-color: #4fc3f7; }
.instance-card.border-amber { border-left-color: #ffa726; }
.instance-card.border-slate { border-left-color: #3a3a5a; }
.instance-card.border-red { border-left-color: #e74c3c; }

.card-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; }
.instance-id { font-weight: 600; font-size: 14px; color: #c0c8e0; }
.instance-name-row { display: inline-flex; align-items: center; gap: 6px; cursor: pointer; }
.instance-name-row:hover .edit-icon { opacity: 1; }
.edit-icon { width: 13px; height: 13px; opacity: 0; transition: opacity 0.15s; color: #667; }
.instance-name-row:hover .edit-icon { opacity: 0.6; }
.instance-name-row:hover .instance-id { color: #4fc3f7; }
.real-name { font-size: 11px; color: #8890b0; font-weight: 400; margin-left: 2px; }
.rename-input { background: #1a1a2e; border: 1px solid #4fc3f7; border-radius: 4px; color: #e0e0e0; font-size: 14px; font-weight: 600; padding: 2px 6px; width: 140px; outline: none; }
.status-chip { padding: 3px 10px; border-radius: 10px; font-size: 11px; font-weight: 600; }
.s-running { background: rgba(102,187,106,.18); color: #66bb6a; }
.s-learning { background: rgba(79,195,247,.18); color: #4fc3f7; }
.s-waiting { background: rgba(255,167,38,.18); color: #ffa726; }
.s-stopped { background: rgba(255,255,255,.06); color: #667; }
.s-error { background: rgba(231,76,60,.18); color: #e74c3c; }

.card-body { margin-bottom: 14px; }
.action-text { font-size: 13px; color: #8890b0; margin-bottom: 6px; }
.url-text { font-size: 11px; color: #555; margin-top: 6px; word-break: break-all; }

.progress-block { margin-top: 8px; }
.progress-header { display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 3px; }
.eta-text { font-size: 11px; color: #4fc3f7; white-space: nowrap; font-weight: 500; }
.progress-label { font-size: 11px; color: #667; }
.progress-track { height: 4px; background: #1e1e3a; border-radius: 2px; overflow: hidden; margin-bottom: 4px; }
.progress-fill { height: 100%; background: linear-gradient(90deg, #4fc3f7, #66bb6a); border-radius: 2px; transition: width .3s; }

.card-actions { display: flex; gap: 6px; }

.btn { display: inline-flex; align-items: center; gap: 5px; padding: 7px 14px; border: none; border-radius: 6px; font-size: 13px; cursor: pointer; transition: all .15s; font-weight: 500; }
.btn:disabled { opacity: .35; cursor: not-allowed; }
.btn:hover:not(:disabled) { filter: brightness(1.15); transform: translateY(-1px); }
.btn-sm { padding: 5px 10px; font-size: 12px; }
.btn-primary { background: #4fc3f7; color: #1a1a2e; }
.btn-ghost { background: rgba(255,255,255,.06); color: #8890b0; }
.btn-ghost:hover { background: rgba(255,255,255,.1); color: #c0c8e0; }
.btn-success { background: rgba(102,187,106,.2); color: #66bb6a; }
.btn-warning { background: rgba(255,167,38,.2); color: #ffa726; }
.btn-danger { background: rgba(231,76,60,.2); color: #e74c3c; }
.btn-icon { width: 14px; height: 14px; flex-shrink: 0; }
</style>
