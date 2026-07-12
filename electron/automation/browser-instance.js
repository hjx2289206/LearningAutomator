import puppeteer from 'puppeteer-core'
import fs from 'fs'
import { TabMonitor } from './tab-monitor.js'
import { LearningAutomation } from './learning-automation.js'

function findChrome() {
  const platform = process.platform
  const customPath = process.env.CHROME_PATH

  if (customPath && fs.existsSync(customPath)) return customPath

  if (platform === 'darwin') {
    const paths = [
      '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
      '/Applications/Chromium.app/Contents/MacOS/Chromium',
    ]
    for (const p of paths) { if (fs.existsSync(p)) return p }
  }

  if (platform === 'win32') {
    const paths = [
      'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
      'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
      process.env.LOCALAPPDATA + '\\Google\\Chrome\\Application\\chrome.exe',
    ]
    for (const p of paths) { if (fs.existsSync(p)) return p }
  }

  if (platform === 'linux') {
    const paths = [
      '/usr/bin/google-chrome',
      '/usr/bin/chromium-browser',
      '/snap/bin/chromium',
    ]
    for (const p of paths) { if (fs.existsSync(p)) return p }
  }

  return null
}

export class BrowserInstance {
  constructor(id, config) {
    this.id = id
    this.config = config
    this.browser = null
    this.page = null
    this.status = '未启动'
    this.currentAction = ''
    this.progress = { current: 0, total: 0, percentage: 0 }
    this.isRunning = false
    this._lastTitle = null
    this.tabMonitor = new TabMonitor(this)
    this.learningAutomation = new LearningAutomation(this)
  }

  async launch() {
    this.status = '启动中'
    this.currentAction = '正在启动浏览器'

    const executablePath = this.config.chrome_path || findChrome()
    if (!executablePath) {
      this.status = '启动失败'
      this.currentAction = '未找到 Chrome，请在设置中指定 Chrome 路径'
      return false
    }

    try {
      this.browser = await puppeteer.launch({
        headless: this.config.headless_mode ?? false,
        executablePath,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--start-maximized',
          '--disable-blink-features=AutomationControlled',
          '--disable-web-security',
          `--window-size=${this.config.window_size || '1200,800'}`,
        ],
        defaultViewport: null,
        userDataDir: this.config.user_data_dir
          ? `${this.config.user_data_dir}/profile_${this.id}`
          : undefined,
      })

      const pages = await this.browser.pages()
      this.page = pages[0] || (await this.browser.newPage())

      await this.page.evaluateOnNewDocument(() => {
        Object.defineProperty(navigator, 'webdriver', { get: () => false })
      })

      // 监听新页面（登录后可能在新标签页打开学习页面）
      this.browser.on('targetcreated', async (target) => {
        if (target.type() === 'page') {
          const newPage = await target.page()
          const url = newPage.url()
          console.log(`[实例#${this.id}] 检测到新标签页: ${url}`)
        }
      })

      this.status = '已启动'
      this.currentAction = '浏览器启动完成，正在打开登录页...'
      this.isRunning = true

      await this._openLoginPage()
      return true
    } catch (e) {
      this.status = '启动失败'
      this.currentAction = `启动失败: ${e.message}`
      return false
    }
  }

  async _openLoginPage() {
    const loginUrl = this.config.login_url || 'https://rsjapp.mianyang.cn/jxjy/pc/member/login.jhtml'
    this.currentAction = '正在打开登录页面'
    try {
      await this.page.goto(loginUrl, { waitUntil: 'networkidle2', timeout: 30000 })
      this.status = '等待登录'
      this.currentAction = '请登录，进入课程页面后自动检测并开始刷课'
    } catch (e) {
      this.currentAction = `打开登录页失败: ${e.message}`
    }
  }

  startAutomation() {
    this._runLoop()
  }

  async _runLoop() {
    try {
      // 1. 等待用户完成登录（URL 不再是 login）
      await this._waitForLogin()

      // 2. 进入课程页面，点击"开始学习"，切换到学习标签页
      const ok = await this._enterCourseAndLearn()
      if (!ok || !this.isRunning) return

      // 3. 开始刷课
      await this.learningAutomation.startLearning()
    } catch (e) {
      if (this.isRunning) {
        this.currentAction = `运行出错: ${e.message}`
        console.error(`[实例#${this.id}]`, e)
      }
    }
  }

  async _waitForLogin() {
    const loginUrl = this.config.login_url || 'https://rsjapp.mianyang.cn/jxjy/pc/member/login.jhtml'
    const maxWait = (this.config.login_timeout || 600) * 1000
    const interval = 3000
    const started = Date.now()

    this.status = '等待登录'
    this.currentAction = '请完成登录，登录后将自动进入课程'

    while (this.isRunning && Date.now() - started < maxWait) {
      let currentUrl = ''
      try { currentUrl = this.page.url() } catch (_) {}
      if (currentUrl && !currentUrl.includes('login') && !currentUrl.includes('/member/')) {
        this.currentAction = '登录完成，准备进入课程...'
        await this._sleep(2000)
        return
      }
      await this._sleep(interval)
    }
  }

  async _enterCourseAndLearn() {
    const courseUrl = this.config.course_url || 'https://rsjapp.mianyang.cn/jxjy/pc/wdkc_1646108788000/index.jhtml'
    this.status = '导航中'
    this.currentAction = '正在进入课程页面...'

    await this.page.goto(courseUrl, { waitUntil: 'networkidle2', timeout: 30000 })
    await this._sleep(3000)

    // 查找"开始学习"或"继续学习"按钮
    this.currentAction = '正在查找课程入口...'
    const clicked = await this.page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('a'))
      for (const btn of btns) {
        const text = (btn.textContent || '').trim()
        if (text.includes('开始学习') || text.includes('继续学习')) {
          btn.click()
          return true
        }
      }
      return false
    })

    if (!clicked) {
      this.currentAction = '未找到"开始学习"/"继续学习"按钮'
      return false
    }

    this.currentAction = '已点击课程，等待学习页面打开...'
    await this._sleep(5000)

    // 等待新标签页打开并切换
    const learningPage = await this._waitForLearningTab(30000)
    if (learningPage) {
      this.page = learningPage
      await learningPage.bringToFront()
      this._lastTitle = await learningPage.title()
      this.status = '已进入学习页'
      this.currentAction = `进入学习页面: ${this._lastTitle}`
      await this._muteAllMedia()
      return true
    }

    this.currentAction = '未能检测到学习页面标签'
    return false
  }

  async _waitForLearningTab(timeout) {
    const started = Date.now()
    while (this.isRunning && Date.now() - started < timeout) {
      const pages = await this.browser.pages()
      for (const p of pages) {
        try {
          const url = p.url()
          const title = await p.title()
          if (url.includes('chrome://') || url.includes('about:')) continue
          if (url.includes('login') || title.includes('登录')) continue
          if (title.includes('首页') || title.includes('个人中心') || title.includes('dashboard')) continue
          // 新打开的标签页（非原始课程入口页、非登录页）视为学习页面
          if (url !== this.page.url() && p !== this.page) {
            return p
          }
        } catch (_) {}
      }
      await this._sleep(2000)
    }
    return null
  }

  async _switchToTab(tabInfo) {
    try {
      const pages = await this.browser.pages()
      for (const p of pages) {
        if (p.url() === tabInfo.url || p === tabInfo.page) {
          this.page = p
          await p.bringToFront()
          this.currentAction = `已切换到学习页面: ${tabInfo.title}`
          return true
        }
      }
      return false
    } catch (e) {
      this.currentAction = `切换标签页失败: ${e.message}`
      return false
    }
  }

  async stop() {
    this.isRunning = false
    if (this.tabMonitor) this.tabMonitor.stopMonitoring()
    this.status = '已停止'
    this.currentAction = '用户手动停止'
    if (this.browser) {
      try { await this.browser.close() } catch (_) {}
    }
    this.browser = null
    this.page = null
  }

  isDriverAlive() {
    return this.browser != null && this.browser.isConnected()
  }

  getStatus() {
    let currentUrl = null
    try { currentUrl = this.page?.url() || null } catch (_) {}
    return {
      browser_id: this.id,
      status: this.status,
      current_action: this.currentAction,
      progress: { ...this.progress },
      current_url: currentUrl,
      title: this._lastTitle || null,
    }
  }


  async _muteAllMedia() {
    if (!this.config.auto_mute) return
    try {
      await this.page.evaluate(() => {
        const muteAll = () => {
          document.querySelectorAll("video, audio").forEach(el => {
            el.muted = true
            el.volume = 0
          })
        }
        muteAll()
        if (!window.__muteObserverInstalled) {
          window.__muteObserverInstalled = true
          new MutationObserver(muteAll).observe(document.body || document.documentElement, {
            childList: true, subtree: true
          })
        }
      })
    } catch (_) {}

  }
  _sleep(ms) {
    return new Promise(r => setTimeout(r, ms))
  }
}
