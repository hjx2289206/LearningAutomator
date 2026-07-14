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
    this.name = config.name || `实例 #${id}`
    this.realName = config.realName || null
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
      await this.page.goto(loginUrl, { waitUntil: 'domcontentloaded', timeout: 30000 })
      this.status = '等待登录'
      this.currentAction = '请在应用内完成登录'
    } catch (e) {
      this.currentAction = `打开登录页失败: ${e.message}`
    }
  }

  async getLoginInfo() {
    if (!this.page || !this.isDriverAlive()) return null

    try {
      await this.page.waitForSelector('#pspUserAccount', { timeout: 15000 })
      const details = await this.page.evaluate(() => {
        const account = document.querySelector('#pspUserAccount')
        const password = document.querySelector('#pspUserPwd')
        const verificationCode = document.querySelector('#verCode')
        const submit = document.querySelector('#pwdLogin')

        return {
          title: document.title || '登录',
          url: window.location.href,
          account_placeholder: account?.getAttribute('placeholder') || '请输入身份证号',
          password_placeholder: password?.getAttribute('placeholder') || '请输入密码',
          verification_placeholder: verificationCode?.getAttribute('placeholder') || '请输入验证码',
          submit_text: (submit?.textContent || '登录').replace(/\s+/g, ''),
        }
      })

      return {
        browser_id: this.id,
        browser_name: this.name,
        ...details,
        captcha_image: await this._captureCaptcha(),
      }
    } catch (_) {
      return null
    }
  }

  async refreshLoginCaptcha() {
    if (!this.page || !this.isDriverAlive()) return null

    try {
      const previousSrc = await this.page.$eval('#imgCode1', img => img.getAttribute('src') || '')
      await this.page.evaluate(() => {
        if (typeof window.fnGetImgCode === 'function') {
          window.fnGetImgCode()
          return
        }
        const img = document.querySelector('#imgCode1')
        if (img) img.src = `${img.src.split('?')[0]}?sid=${Math.random()}`
      })
      await this.page.waitForFunction(
        oldSrc => {
          const img = document.querySelector('#imgCode1')
          return Boolean(img && img.complete && img.naturalWidth > 0 && img.getAttribute('src') !== oldSrc)
        },
        { timeout: 10000 },
        previousSrc,
      )
      return await this._captureCaptcha()
    } catch (_) {
      return await this._captureCaptcha()
    }
  }

  async submitLogin(credentials = {}) {
    if (!this.page || !this.isDriverAlive()) {
      return { success: false, message: '浏览器未运行' }
    }

    const input = credentials && typeof credentials === 'object' ? credentials : {}
    const account = String(input.account || '').trim()
    const password = String(input.password || '')
    const verificationCode = String(input.verificationCode || '').trim()
    if (!account || !password || !verificationCode) {
      return { success: false, message: '请完整填写登录信息' }
    }

    try {
      await this.page.waitForSelector('#pspUserAccount', { timeout: 10000 })
      await this.page.evaluate(({ accountValue, passwordValue, codeValue }) => {
        if (!window.__learningAutomatorAlertWrapped && typeof window.Alert === 'function') {
          const originalAlert = window.Alert
          window.Alert = function (...args) {
            window.__learningAutomatorLoginError = String(args[1] || args[0] || '')
            return originalAlert.apply(this, args)
          }
          window.__learningAutomatorAlertWrapped = true
        }
        window.__learningAutomatorLoginError = ''

        const fill = (selector, value) => {
          const input = document.querySelector(selector)
          if (!input) throw new Error(`未找到登录字段: ${selector}`)
          const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set
          setter?.call(input, value)
          input.dispatchEvent(new Event('input', { bubbles: true }))
          input.dispatchEvent(new Event('change', { bubbles: true }))
        }

        fill('#pspUserAccount', accountValue)
        fill('#pspUserPwd', passwordValue)
        fill('#verCode', codeValue)
      }, { accountValue: account, passwordValue: password, codeValue: verificationCode })

      this.status = '登录中'
      this.currentAction = '正在提交登录信息...'
      await this.page.click('#pwdLogin')

      const outcomeHandle = await this.page.waitForFunction(() => {
        if (!window.location.pathname.includes('/member/login')) {
          return { success: true }
        }

        if (window.__learningAutomatorLoginError) {
          return { success: false, message: window.__learningAutomatorLoginError.slice(0, 160) }
        }

        const errorPattern = /(错误|失败|不正确|不能为空|验证码|密码不符合|账号不存在|请重试)/
        const candidates = document.querySelectorAll(
          '.ta-message, .message, .alert, .dialog, [class*="message"], [class*="alert"]',
        )
        for (const element of candidates) {
          const style = window.getComputedStyle(element)
          const text = (element.textContent || '').replace(/\s+/g, ' ').trim()
          if (style.display !== 'none' && style.visibility !== 'hidden' && text && errorPattern.test(text)) {
            return { success: false, message: text.slice(0, 160) }
          }
        }
        return false
      }, { polling: 250, timeout: 12000 })

      const outcome = await outcomeHandle.jsonValue()
      if (outcome?.success) {
        this.currentAction = '登录成功，正在进入课程...'
        return { success: true }
      }

      this.status = '等待登录'
      this.currentAction = outcome?.message || '登录失败，请检查后重试'
      return {
        success: false,
        message: outcome?.message || '登录失败，请检查账号、密码和验证码',
        captcha_image: await this.refreshLoginCaptcha(),
      }
    } catch (e) {
      const currentUrl = this.page?.url() || ''
      if (currentUrl && !currentUrl.includes('login') && !currentUrl.includes('/member/')) {
        this.currentAction = '登录成功，正在进入课程...'
        return { success: true }
      }

      this.status = '等待登录'
      this.currentAction = `登录未完成: ${e.message}`
      return {
        success: false,
        message: '登录未完成，请检查信息后重试',
        captcha_image: await this.refreshLoginCaptcha(),
      }
    }
  }

  async _captureCaptcha() {
    if (!this.page) return null
    try {
      await this.page.waitForFunction(() => {
        const img = document.querySelector('#imgCode1')
        return Boolean(img && img.complete && img.naturalWidth > 0)
      }, { timeout: 10000 })
      const image = await this.page.$('#imgCode1')
      if (!image) return null
      const base64 = await image.screenshot({ encoding: 'base64' })
      return `data:image/png;base64,${base64}`
    } catch (_) {
      return null
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
    this.currentAction = '请在应用内完成登录，登录后将自动进入课程'

    while (this.isRunning && Date.now() - started < maxWait) {
      let currentUrl = ''
      try { currentUrl = this.page.url() } catch (_) {}
      if (currentUrl && !currentUrl.includes('login') && !currentUrl.includes('/member/')) {
        this.currentAction = '登录完成，准备进入课程...'
        // 自动提取用户名作为实例名称
        try {
          const userName = await this.page.evaluate(() => {
            const links = document.querySelectorAll('a');
            for (const a of links) {
              const match = (a.textContent || '').trim().match(/欢迎您[：:]\s*(.+)/);
              if (match) return match[1].trim();
            }
            return null;
          });
          if (userName) {
            this.realName = userName;
            this.currentAction = `登录完成 (${userName})，准备进入课程...`;
          }
        } catch (_) {}
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

    // 检查是否需要先选课
    this.currentAction = '正在检查是否需要选课...'
    const hasSelectCourse = await this.page.evaluate(() => {
      const links = document.querySelectorAll('a');
      for (const a of links) {
        if ((a.textContent || '').trim() === '选课') return true;
      }
      return false;
    });

    if (hasSelectCourse) {
      this.currentAction = '正在选课...'

      // 先注册原生 confirm 弹窗监听器，再触发点击
      // Puppeteer 标准模式：两个动作并行执行
      const [dialog] = await Promise.all([
        new Promise((resolve) => {
          const timeout = setTimeout(() => resolve(null), 10000);
          this.page.once('dialog', (d) => {
            clearTimeout(timeout);
            resolve(d);
          });
        }),
        // 点击选课链接（dispatchEvent 触发 onclick；如果有 href 也会导航）
        this.page.evaluate(() => {
          const links = document.querySelectorAll('a');
          for (const a of links) {
            if ((a.textContent || '').trim() === '选课') {
              a.dispatchEvent(new MouseEvent('click', { bubbles: true }));
              return;
            }
          }
        }).catch(() => {}),
      ]);

      // 如果捕获到原生 confirm 弹窗，直接确认
      if (dialog) {
        this.currentAction = '正在确认选课...';
        await dialog.accept();
        await this._sleep(3000);
      } else {
        // 没有原生弹窗，说明是 HTML 模态框，等待渲染后查找并点击
        await this._sleep(3000);
        this.currentAction = '正在确认选课...';
        await this.page.evaluate(() => {
          // 搜索所有可见元素（不限标签类型）
          const allElements = document.querySelectorAll('*');
          for (const el of allElements) {
            const text = (el.textContent || '').trim();
            if (text === '确认选课' || text === '确定') {
              // 找可交互的父级元素
              let target = el;
              while (target && target !== document.body) {
                const tag = target.tagName.toLowerCase();
                if (tag === 'a' || tag === 'button' || (tag === 'input' && target.type.match(/button|submit/))) {
                  target.dispatchEvent(new MouseEvent('click', { bubbles: true }));
                  return true;
                }
                target = target.parentElement;
              }
              // 没找到可点击的父级，直接点文本元素本身
              el.dispatchEvent(new MouseEvent('click', { bubbles: true }));
              return true;
            }
          }
          return false;
        }).catch(() => {});
      }

      // 重新导航到课程页确保状态最新
      await this._sleep(3000);
      this.currentAction = '选课完成，返回课程页...';
      await this.page.goto(courseUrl, { waitUntil: 'networkidle2', timeout: 30000 });
      await this._sleep(3000);
    }

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
      name: this.name,
      real_name: this.realName,
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
  _sendNotification(title, body) {
    try {
      const { Notification } = require('electron');
      if (Notification.isSupported()) {
        new Notification({ title, body }).show();
      }
    } catch (_) {}
  }

  _sleep(ms) {
    return new Promise(r => setTimeout(r, ms))
  }
}
