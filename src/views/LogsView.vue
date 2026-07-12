<template>
  <div class="logs">
    <div class="page-header">
      <h1>运行日志</h1>
      <div class="header-actions">
        <button class="btn btn-ghost" @click="loadData">
          <svg class="btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>
          刷新
        </button>
        <button class="btn btn-ghost" @click="clearLogs">清空</button>
      </div>
    </div>

    <div class="filters">
      <select v-model="filterId">
        <option value="">全部实例</option>
        <option v-for="id in instanceIds" :key="id" :value="id">实例 #{{ id }}</option>
      </select>
      <select v-model="filterStatus">
        <option value="">全部状态</option>
        <option value="运行中">运行中</option>
        <option value="刷课中">刷课中</option>
        <option value="等待登录">等待登录</option>
        <option value="已完成">已完成</option>
        <option value="错误">错误</option>
      </select>
    </div>

    <div class="log-panel" ref="panelRef">
      <div v-for="(entry, i) in filtered" :key="i" class="log-entry" :class="levelClass(entry.status)">
        <span class="log-time">{{ formatTime(entry.timestamp) }}</span>
        <span class="log-instance">#{{ entry.browser_id }}</span>
        <span class="log-level" :class="levelClass(entry.status)">{{ levelLabel(entry.status) }}</span>
        <span class="log-msg">{{ entry.current_action }}</span>
        <span v-if="entry.progress && entry.progress.total > 0" class="log-progress">
          {{ entry.progress.current }}/{{ entry.progress.total }}
        </span>
      </div>
      <div v-if="filtered.length === 0" class="empty-logs">暂无日志</div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, nextTick } from 'vue'
import { getBrowsers } from '@/services/api'

interface LogEntry {
  browser_id: number; status: string; current_action: string
  progress?: { current: number; total: number; percentage: number }; timestamp: number
}
interface BrowserRow { browser_id: number; status: string; current_action: string; progress?: { current: number; total: number; percentage: number } }

const history = ref<LogEntry[]>([])
const filterId = ref<string | number>('')
const filterStatus = ref('')
const panelRef = ref<HTMLElement | null>(null)
let interval: number

const instanceIds = computed(() => {
  const ids = new Set(history.value.map(e => e.browser_id))
  return Array.from(ids).sort((a,b) => a - b)
})

async function loadData() {
  try {
    const list: BrowserRow[] = await getBrowsers()
    const now = Date.now()
    for (const b of list) {
      const last = history.value[history.value.length - 1]
      const same = last && last.browser_id === b.browser_id && last.status === b.status && last.current_action === b.current_action
      if (!same || (now - last.timestamp) > 10000) {
        history.value.push({
          browser_id: b.browser_id, status: b.status,
          current_action: b.current_action,
          progress: b.progress, timestamp: now,
        })
      }
    }
    if (history.value.length > 500) history.value = history.value.slice(-500)
    await nextTick()
    if (panelRef.value) panelRef.value.scrollTop = panelRef.value.scrollHeight
  } catch(e) { console.warn('日志加载失败:', e) }
}

const filtered = computed(() => {
  let items = history.value
  if (filterId.value !== '') items = items.filter(e => e.browser_id === Number(filterId.value))
  if (filterStatus.value) items = items.filter(e => e.status === filterStatus.value)
  return items.slice(-200)
})

function clearLogs() { history.value = [] }
function formatTime(ts: number) { return new Date(ts).toLocaleTimeString('zh-CN') }
function levelClass(s: string) {
  const m: Record<string, string> = { '运行中': 'l-info', '刷课中': 'l-learning', '等待登录': 'l-warn', '已完成': 'l-ok', '错误': 'l-err' }
  return m[s] || 'l-info'
}
function levelLabel(s: string) {
  const m: Record<string, string> = { '运行中': 'INFO', '刷课中': 'LEARN', '等待登录': 'WAIT', '已完成': 'DONE', '错误': 'ERROR' }
  return m[s] || 'INFO'
}

onMounted(() => { loadData(); interval = setInterval(loadData, 3000) })
onUnmounted(() => clearInterval(interval))
</script>

<style scoped>
.logs { padding: 28px 32px; max-width: 1100px; }
.page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
.page-header h1 { font-size: 22px; font-weight: 600; color: #e0e0e0; }
.header-actions { display: flex; gap: 8px; }

.filters { display: flex; gap: 10px; margin-bottom: 14px; }
.filters select {
  padding: 6px 12px; border: 1px solid #2a2a4a; border-radius: 6px;
  background: #16163a; color: #c0c8e0; font-size: 12px; min-width: 120px;
}

.log-panel {
  background: #12122a; border: 1px solid #1e1e3a; border-radius: 8px;
  max-height: 500px; overflow-y: auto; font-family: 'SF Mono', 'Fira Code', monospace; font-size: 12px;
}
.log-entry {
  display: flex; align-items: center; gap: 12px; padding: 6px 14px;
  border-bottom: 1px solid #1a1a2e; line-height: 1.5;
}
.log-entry:hover { background: rgba(255,255,255,.02); }

.log-time { color: #555; white-space: nowrap; min-width: 80px; }
.log-instance { color: #667; font-weight: 600; min-width: 50px; }
.log-level { padding: 1px 6px; border-radius: 3px; font-size: 10px; font-weight: 700; white-space: nowrap; }
.l-info .log-level, .l-info { --c: #8890b0; } .l-info .log-level { background: rgba(136,144,176,.15); color: #8890b0; }
.l-learning { --c: #4fc3f7; } .l-learning .log-level { background: rgba(79,195,247,.15); color: #4fc3f7; }
.l-warn { --c: #ffa726; } .l-warn .log-level { background: rgba(255,167,38,.15); color: #ffa726; }
.l-ok { --c: #66bb6a; } .l-ok .log-level { background: rgba(102,187,106,.15); color: #66bb6a; }
.l-err { --c: #e74c3c; } .l-err .log-level { background: rgba(231,76,60,.15); color: #e74c3c; }

.log-msg { color: #c0c8e0; flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.log-progress { color: #4fc3f7; white-space: nowrap; }

.empty-logs { padding: 40px; text-align: center; color: #555; }

.btn { display: inline-flex; align-items: center; gap: 5px; padding: 7px 14px; border: none; border-radius: 6px; font-size: 13px; cursor: pointer; transition: all .15s; font-weight: 500; }
.btn-ghost { background: rgba(255,255,255,.06); color: #8890b0; }
.btn-ghost:hover { background: rgba(255,255,255,.1); color: #c0c8e0; }
.btn-icon { width: 14px; height: 14px; flex-shrink: 0; }
</style>
