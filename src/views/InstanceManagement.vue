<template>
  <div class="instance-mgmt">
    <div class="page-header">
      <h1>实例管理</h1>
      <div class="header-actions">
        <button class="btn btn-primary" @click="createBrowser">+ 新建实例</button>
        <button class="btn btn-ghost" @click="stopAll">停止全部</button>
        <button class="btn btn-ghost" @click="loadBrowsers()">
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
      <button class="btn btn-primary" @click="loadBrowsers()">重试</button>
    </div>

    <div v-else class="instances-grid" :class="{ 'is-empty': browsers.length === 0 }">
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
          <button class="btn btn-sm btn-success" @click="start(b.browser_id)" :disabled="!canStart(b.status) || startingId === b.browser_id">
            <svg class="btn-icon" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg>
            {{ startingId === b.browser_id ? '启动中' : '启动' }}
          </button>
          <button v-if="b.status === '等待登录' || b.status === '登录中'" class="btn btn-sm btn-login" @click="showLogin(b.browser_id)">
            <svg class="btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/><polyline points="10 17 15 12 10 7"/><line x1="15" y1="12" x2="3" y2="12"/></svg>
            登录
          </button>
          <button class="btn btn-sm btn-warning" @click="stop(b.browser_id)" :disabled="b.status === '已停止' || b.status === '未启动'">
            <svg class="btn-icon" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>
            停止
          </button>
          <button class="btn btn-sm btn-danger" @click="remove(b.browser_id)" :disabled="b.status === '运行中' || b.status === '刷课中'">
            <svg class="btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
            移除
          </button>
        </div>
      </div>

      <div v-if="browsers.length === 0" class="state-box empty-state">
        <svg class="empty-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
          <rect x="2" y="3" width="20" height="14" rx="2" ry="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/>
        </svg>
        <div class="empty-label">暂无浏览器实例</div>
        <button class="btn btn-primary" @click="createBrowser">创建第一个实例</button>
      </div>
    </div>

    <Teleport to="body">
      <Transition name="dialog-pop">
        <div v-if="loginDialog" class="dialog-backdrop" @click.self="closeLoginDialog" @keydown.esc="closeLoginDialog">
          <section class="login-dialog" role="dialog" aria-modal="true" aria-labelledby="login-dialog-title">
            <header class="dialog-header">
              <div>
                <h2 id="login-dialog-title">{{ loginDialog.title || '账号登录' }}</h2>
                <p>{{ loginDialog.browser_name || `实例 #${loginDialog.browser_id}` }}</p>
              </div>
              <button class="icon-btn" type="button" title="关闭" aria-label="关闭登录窗口" @click="closeLoginDialog">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </header>

            <form class="login-form" @submit.prevent="submitLogin">
              <label v-if="savedCredentials.length > 0 || credentialsLoading" class="login-field">
                <span>登录档案</span>
                <div class="credential-picker" :class="{ 'has-remove': selectedCredentialAccount }">
                  <select
                    v-model="selectedCredentialAccount"
                    :disabled="credentialsLoading"
                    @change="selectCredential"
                  >
                    <option value="">{{ credentialsLoading ? '正在加载...' : '手动输入账号' }}</option>
                    <option v-for="profile in savedCredentials" :key="profile.account" :value="profile.account">
                      {{ credentialLabel(profile) }}
                    </option>
                  </select>
                  <button
                    v-if="selectedCredentialAccount"
                    class="credential-remove"
                    type="button"
                    title="删除登录档案"
                    aria-label="删除登录档案"
                    @click="deleteSelectedCredential"
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                  </button>
                </div>
              </label>

              <label class="login-field">
                <span>身份证号</span>
                <input v-model.trim="loginForm.account" type="text" :placeholder="loginDialog.account_placeholder" autocomplete="username" required autofocus @input="selectedCredentialAccount = ''" />
              </label>

              <label class="login-field">
                <span>密码</span>
                <div class="password-input">
                  <input v-model="loginForm.password" :type="showPassword ? 'text' : 'password'" :placeholder="loginDialog.password_placeholder" autocomplete="current-password" required />
                  <button class="password-toggle" type="button" :title="showPassword ? '隐藏密码' : '显示密码'" :aria-label="showPassword ? '隐藏密码' : '显示密码'" @click="showPassword = !showPassword">
                    <svg v-if="showPassword" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7S1 12 1 12z"/><circle cx="12" cy="12" r="3"/></svg>
                    <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.5 18.5 0 0 1 5.06-5.94M9.9 4.24A9.1 9.1 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19M1 1l22 22"/></svg>
                  </button>
                </div>
              </label>

              <label class="login-field">
                <span>图片验证码</span>
                <div class="captcha-row">
                  <input v-model.trim="loginForm.verificationCode" type="text" :placeholder="loginDialog.verification_placeholder" autocomplete="off" required />
                  <button class="captcha-button" type="button" title="刷新验证码" :disabled="captchaLoading" @click="refreshCaptcha">
                    <img v-if="loginDialog.captcha_image" :src="loginDialog.captcha_image" alt="图片验证码" />
                    <svg v-else class="captcha-refresh" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>
                    <span v-if="captchaLoading" class="captcha-spinner"></span>
                  </button>
                </div>
              </label>

              <p v-if="loginError" class="login-error" role="alert">{{ loginError }}</p>

              <footer class="dialog-actions">
                <button class="btn btn-ghost" type="button" :disabled="loginSubmitting" @click="closeLoginDialog">取消</button>
                <button class="btn btn-primary" type="submit" :disabled="loginSubmitting">
                  <span v-if="loginSubmitting" class="button-spinner"></span>
                  {{ loginSubmitting ? '登录中...' : (loginDialog.submit_text || '登录') }}
                </button>
              </footer>
            </form>
          </section>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import {
  getBrowsers,
  createBrowser as apiCreate,
  startBrowser,
  stopBrowser,
  removeBrowser,
  stopAllBrowsers,
  renameBrowser,
  getLoginInfo,
  refreshLoginCaptcha,
  loginBrowser,
  listCredentials,
  getCredential,
  removeCredential,
} from '@/services/api'

interface BrowserInst {
  browser_id: number; name?: string | null; real_name?: string | null; status: string; current_action: string
  progress?: { current: number; total: number; percentage: number; eta?: string | null; eta_seconds?: number | null }
  current_url?: string; title?: string
}

interface LoginInfo {
  browser_id: number
  browser_name?: string
  title?: string
  url?: string
  account_placeholder?: string
  password_placeholder?: string
  verification_placeholder?: string
  submit_text?: string
  captcha_image?: string | null
}

interface SavedCredential {
  account: string
  name?: string | null
  preferred?: boolean
  updated_at?: string
}

const browsers = ref<BrowserInst[]>([])
const loading = ref(true)
const error = ref('')
const editingNameId = ref<number | null>(null)
const renameValue = ref("")
const startingId = ref<number | null>(null)
const loginDialog = ref<LoginInfo | null>(null)
const loginForm = ref({ account: '', password: '', verificationCode: '' })
const loginError = ref('')
const loginSubmitting = ref(false)
const captchaLoading = ref(false)
const showPassword = ref(false)
const savedCredentials = ref<SavedCredential[]>([])
const selectedCredentialAccount = ref('')
const credentialsLoading = ref(false)
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
  if (startingId.value !== null) return
  try {
    startingId.value = id
    const result = await startBrowser(id)
    await loadBrowsers()
    if (result?.success && result.login) openLoginDialog(result.login)
  } catch (e) {
    console.error(e)
  } finally {
    startingId.value = null
  }
}

function canStart(status: string) {
  return status === '未启动' || status === '已停止' || status === '启动失败' || status === '错误'
}

function openLoginDialog(info: LoginInfo) {
  loginDialog.value = info
  loginForm.value = { account: '', password: '', verificationCode: '' }
  savedCredentials.value = []
  selectedCredentialAccount.value = ''
  loginError.value = ''
  showPassword.value = false
  void loadCredentials(info.browser_id)
}

async function loadCredentials(browserId: number) {
  try {
    credentialsLoading.value = true
    const profiles = await listCredentials(browserId) as SavedCredential[]
    if (loginDialog.value?.browser_id !== browserId) return
    savedCredentials.value = profiles
    const preferred = profiles.find(profile => profile.preferred)
    if (preferred) {
      selectedCredentialAccount.value = preferred.account
      await applyCredential(preferred.account, browserId)
    }
  } catch (e) {
    console.error('加载登录档案失败:', e)
  } finally {
    if (loginDialog.value?.browser_id === browserId) credentialsLoading.value = false
  }
}

async function selectCredential() {
  if (!loginDialog.value) return
  if (!selectedCredentialAccount.value) {
    loginForm.value.account = ''
    loginForm.value.password = ''
    return
  }
  await applyCredential(selectedCredentialAccount.value, loginDialog.value.browser_id)
}

async function applyCredential(account: string, browserId: number) {
  try {
    const credential = await getCredential(account)
    if (!credential || loginDialog.value?.browser_id !== browserId) return
    loginForm.value.account = credential.account
    loginForm.value.password = credential.password
  } catch (e: any) {
    loginError.value = e?.message || '读取登录档案失败'
  }
}

async function deleteSelectedCredential() {
  const account = selectedCredentialAccount.value
  if (!account || !confirm('确定删除这个登录档案吗？')) return
  try {
    await removeCredential(account)
    savedCredentials.value = savedCredentials.value.filter(profile => profile.account !== account)
    selectedCredentialAccount.value = ''
    loginForm.value = { account: '', password: '', verificationCode: loginForm.value.verificationCode }
  } catch (e: any) {
    loginError.value = e?.message || '删除登录档案失败'
  }
}

function credentialLabel(profile: SavedCredential) {
  const account = profile.account
  const masked = account.length > 7
    ? `${account.slice(0, 3)}****${account.slice(-4)}`
    : account
  return profile.name ? `${profile.name} · ${masked}` : masked
}

async function showLogin(id: number) {
  try {
    const info = await getLoginInfo(id)
    if (info) openLoginDialog(info)
  } catch (e) {
    console.error(e)
  }
}

function closeLoginDialog() {
  if (loginSubmitting.value) return
  loginDialog.value = null
  savedCredentials.value = []
  selectedCredentialAccount.value = ''
  loginForm.value.password = ''
  loginForm.value.verificationCode = ''
  loginError.value = ''
}

async function refreshCaptcha() {
  if (!loginDialog.value || captchaLoading.value) return
  try {
    captchaLoading.value = true
    const image = await refreshLoginCaptcha(loginDialog.value.browser_id)
    if (image && loginDialog.value) loginDialog.value.captcha_image = image
    loginForm.value.verificationCode = ''
  } catch (e) {
    console.error(e)
  } finally {
    captchaLoading.value = false
  }
}

async function submitLogin() {
  if (!loginDialog.value || loginSubmitting.value) return
  loginError.value = ''
  try {
    loginSubmitting.value = true
    const result = await loginBrowser(loginDialog.value.browser_id, loginForm.value)
    if (result?.success) {
      if (result.credentials_warning) alert(`登录成功，但密码未保存：${result.credentials_warning}`)
      loginDialog.value = null
      savedCredentials.value = []
      selectedCredentialAccount.value = ''
      loginForm.value = { account: '', password: '', verificationCode: '' }
      await loadBrowsers()
      return
    }

    loginError.value = result?.message || '登录失败，请检查后重试'
    if (result?.captcha_image && loginDialog.value) {
      loginDialog.value.captcha_image = result.captcha_image
      loginForm.value.verificationCode = ''
    }
  } catch (e: any) {
    loginError.value = e?.message || '登录请求失败'
  } finally {
    loginSubmitting.value = false
  }
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
.instances-grid.is-empty {
  min-height: calc(100vh - 151px);
  display: flex;
  align-items: center;
  justify-content: center;
}
.empty-state { padding: 0; }

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
.btn-login { background: rgba(79,195,247,.18); color: #4fc3f7; }
.btn-danger { background: rgba(231,76,60,.2); color: #e74c3c; }
.btn-icon { width: 14px; height: 14px; flex-shrink: 0; }

.dialog-backdrop {
  position: fixed; inset: 0; z-index: 1000; display: grid; place-items: center;
  padding: 24px; background: rgba(5, 5, 12, .72); backdrop-filter: blur(5px);
}
.login-dialog {
  width: min(440px, 100%); background: #151524; border: 1px solid #303044;
  border-radius: 8px; box-shadow: 0 24px 70px rgba(0, 0, 0, .5); overflow: hidden;
}
.dialog-header {
  min-height: 72px; display: flex; align-items: center; justify-content: space-between;
  padding: 16px 18px 14px 22px; border-bottom: 1px solid #292938; background: #11111c;
}
.dialog-header h2 { color: #f2f2f5; font-size: 16px; font-weight: 650; line-height: 1.4; }
.dialog-header p { margin-top: 2px; color: #74748a; font-size: 12px; }
.icon-btn {
  width: 32px; height: 32px; display: grid; place-items: center; border: 0; border-radius: 5px;
  background: transparent; color: #77778b; cursor: pointer;
}
.icon-btn:hover { background: #242433; color: #ececf0; }
.icon-btn svg { width: 17px; height: 17px; }
.login-form { padding: 20px 22px 18px; }
.login-field { display: block; margin-bottom: 15px; }
.login-field > span { display: block; margin-bottom: 6px; color: #9999aa; font-size: 12px; font-weight: 550; }
.login-field input {
  width: 100%; height: 40px; padding: 0 12px; border: 1px solid #313144; border-radius: 6px;
  background: #0e0e17; color: #eeeeF2; font-size: 13px;
}
.login-field input::placeholder { color: #555568; }
.credential-picker { display: grid; grid-template-columns: minmax(0, 1fr); gap: 8px; }
.credential-picker.has-remove { grid-template-columns: minmax(0, 1fr) 40px; }
.credential-picker select {
  width: 100%; height: 40px; padding: 0 34px 0 12px; border: 1px solid #313144; border-radius: 6px;
  background: #0e0e17; color: #eeeeF2; font-size: 13px; cursor: pointer;
}
.credential-picker select:disabled { color: #666678; cursor: wait; }
.credential-remove {
  width: 40px; height: 40px; display: grid; place-items: center; border: 1px solid #3b2b31; border-radius: 6px;
  background: #21151a; color: #d86a7a; cursor: pointer;
}
.credential-remove:hover { background: #301a21; color: #f08391; }
.credential-remove svg { width: 16px; height: 16px; }
.password-input { position: relative; }
.password-input input { padding-right: 42px; }
.password-toggle {
  position: absolute; top: 4px; right: 4px; width: 32px; height: 32px; display: grid; place-items: center;
  border: 0; border-radius: 4px; background: transparent; color: #68687b; cursor: pointer;
}
.password-toggle:hover { background: #20202e; color: #b4b4c0; }
.password-toggle svg { width: 16px; height: 16px; }
.captcha-row { display: grid; grid-template-columns: minmax(0, 1fr) 126px; gap: 10px; }
.captcha-button {
  position: relative; width: 126px; height: 40px; overflow: hidden; display: grid; place-items: center;
  padding: 0; border: 1px solid #313144; border-radius: 6px; background: #fff; cursor: pointer;
}
.captcha-button:disabled { cursor: wait; }
.captcha-button img { width: 100%; height: 100%; object-fit: cover; }
.captcha-refresh { width: 18px; height: 18px; color: #20202a; }
.captcha-spinner {
  position: absolute; inset: 0; margin: auto; width: 20px; height: 20px; border: 2px solid rgba(0,0,0,.18);
  border-top-color: #111; border-radius: 50%; animation: spin .7s linear infinite;
}
.login-error {
  margin: 2px 0 14px; padding: 9px 11px; border-left: 3px solid #ef5350;
  background: rgba(239, 83, 80, .1); color: #ff8a87; font-size: 12px; line-height: 1.5;
}
.dialog-actions { display: flex; justify-content: flex-end; gap: 8px; margin-top: 20px; }
.dialog-actions .btn { min-width: 78px; justify-content: center; }
.button-spinner {
  width: 13px; height: 13px; border: 2px solid rgba(26,26,46,.25); border-top-color: #1a1a2e;
  border-radius: 50%; animation: spin .7s linear infinite;
}
.dialog-pop-enter-active { animation: dialog-in .32s cubic-bezier(.2, .9, .25, 1.12); }
.dialog-pop-leave-active { animation: dialog-out .18s ease-in; }
@keyframes dialog-in {
  from { transform: translateY(18px) scale(.96); opacity: 0; }
  to { transform: translateY(0) scale(1); opacity: 1; }
}
@keyframes dialog-out {
  from { transform: translateY(0) scale(1); opacity: 1; }
  to { transform: translateY(10px) scale(.98); opacity: 0; }
}
</style>
