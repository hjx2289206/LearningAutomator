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
    while (this.isRunning) {
      try {
        this.status = '监控中'
        this.currentAction = '正在扫描标签页，寻找学习页面...'

        const tabInfo = await this.tabMonitor.startMonitoring()
        if (!tabInfo || !this.isRunning) break

        this._lastTitle = tabInfo.title
        console.log(`[实例#${this.id}] 检测到学习页面: ${tabInfo.title} (${tabInfo.url})`)
        await this._switchToTab(tabInfo)

        if (tabInfo.type === 'learning') {
          await this.learningAutomation.startLearning()
        }

        if (this.isRunning) {
          this.status = '任务完成，继续监控'
          this.currentAction = '等待新的学习页面'
          await this._sleep(5000)
        }
      } catch (e) {
        if (!this.isRunning) break
        this.currentAction = `主循环出错: ${e.message}`
        await this._sleep(10000)
      }
    }
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
      progress: { current: this.progress.current, total: this.progress.total, percentage: this.progress.percentage },
      current_url: currentUrl,
      title: this._lastTitle || null,
    }
  }
  _sleep(ms) {
    return new Promise(r => setTimeout(r, ms))
  }
}
