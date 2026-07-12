export class TabMonitor {
  constructor(instance) {
    this.instance = instance
    this._active = false
  }

  async startMonitoring() {
    this._active = true
    const inst = this.instance
    const interval = (inst.config.monitor_interval || 10) * 1000
    const maxTime = (inst.config.max_monitor_time || 3600) * 1000
    const startedAt = Date.now()

    while (this._active && inst.isRunning) {
      if (!inst.isDriverAlive()) {
        this._active = false
        return null
      }
      if (maxTime > 0 && Date.now() - startedAt > maxTime) {
        inst.currentAction = '监控超时，停止检测'
        this._active = false
        return null
      }

      try {
        const tabInfo = await this._checkTabs()
        if (tabInfo) {
          this._active = false
          return tabInfo
        }
      } catch (e) {
        console.log(`[TabMonitor#${inst.id}] checkTabs error:`, e.message)
      }

      // 显示当前正在扫描的页面标题
      try {
        const title = await inst.page?.title() || ''
        inst.currentAction = `监控中... 当前页面: ${title.slice(0, 40)}`
      } catch (_) {
        inst.currentAction = '监控中...未检测到学习页面'
      }
      await inst._sleep(interval)
    }

    return null
  }

  async _checkTabs() {
    const inst = this.instance
    const pages = await inst.browser.pages()
    const cfg = inst.config

    for (const page of pages) {
      let url = '', title = ''
      try {
        url = page.url()
        title = await page.title()
        console.log(`[TabMonitor#${inst.id}] 扫描: "${title.slice(0, 30)}" | ${url.slice(0, 60)}`)
      } catch (_) { continue }

      if (this._isLearningPage(url, title, cfg)) {
        return { page, url, title, type: 'learning' }
      }
    }

    return null
  }

  _isLearningPage(url, title, cfg) {
    const u = (url || '').toLowerCase()
    const t = (title || '').toLowerCase()

    // 排除登录页
    const loginUrl = (cfg.login_url || '').toLowerCase()
    if (loginUrl && u.startsWith(loginUrl)) return false
    // 更宽松的登录排除：URL 或标题含 login
    if (u.includes('login') || u.includes('/member/')) return false
    if (t.includes('登录') || t.includes('login') || t.includes('个人中心') || t.includes('首页') || t.includes('dashboard')) return false

    const pageKeywords = cfg.learning_page_keywords || ['在线学习', '课程', '视频']
    const urlKeywords = cfg.learning_url_keywords || ['/jxjy/', '/pc/']

    if (pageKeywords.some(kw => t.includes(kw.toLowerCase()))) return true
    if (urlKeywords.some(kw => u.includes(kw.toLowerCase()))) return true
    
    // 额外宽松匹配：URL 不含 login 且标题含中文且长度 > 4（可能是有内容的页面）
    if (!u.includes('login') && t.length > 4 && /[\u4e00-\u9fff]/.test(title)) {
      // 只要不是纯空白页或 about:blank，可能是课程页
      // 这里不做过于宽松的匹配，避免误判
    }
    
    return false
  }

  stopMonitoring() {
    this._active = false
  }
}
