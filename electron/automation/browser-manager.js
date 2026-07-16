import path from 'path'
import fs from 'fs'
import { fileURLToPath } from 'url'
import { BrowserInstance } from './browser-instance.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

const DEFAULT_CONFIG = {
  chrome_path: '',
  user_data_dir: 'user_data',
  auto_mute: true,
  login_url: 'https://rsjapp.mianyang.cn/jxjy/pc/member/login.jhtml',
  max_learning_attempts: 100,
  learning_check_interval: 10,
  miaoke_enabled: true,
  headless_mode: false,
  window_size: '1200,800',
  monitor_interval: 10,
  max_monitor_time: 3600,
  learning_page_keywords: ['在线学习', '学习', '课程', '视频', 'jxjy'],
  learning_url_keywords: ['/jxjy/', '/pc/'],
}

export class BrowserManager {
  constructor({
    dataDir = path.join(__dirname, '..', '..'),
    legacyDataDir = null,
    onIdentityChange = null,
  } = {}) {
    this.dataDir = dataDir
    this.configPath = path.join(dataDir, 'config.json')
    this.instancesPath = path.join(dataDir, 'instances.json')
    this.onIdentityChange = onIdentityChange
    fs.mkdirSync(this.dataDir, { recursive: true })
    this._migrateLegacyFile('config.json', legacyDataDir)
    this._migrateLegacyFile('instances.json', legacyDataDir)

    this.browsers = new Map()
    this.nextId = 1
    this.config = { ...DEFAULT_CONFIG, ...this._loadConfig() }
    this._migrateLegacyBrowserData(legacyDataDir)
    this._loadInstances()
  }

  createBrowser(configOverrides = {}) {
    const name = configOverrides.name || null
    const id = this.nextId++
    const cfg = { ...this.config, ...configOverrides, name }
    const inst = this._createInstance(id, cfg)
    this.browsers.set(id, inst)
    this._saveInstances()
    return id
  }

  async startBrowser(id) {
    const inst = this.browsers.get(id)
    if (!inst) return false
    const ok = await inst.launch()
    if (ok) inst.startAutomation()
    return ok
  }

  async stopBrowser(id) {
    const inst = this.browsers.get(id)
    if (inst) await inst.stop()
  }

  async getLoginInfo(id) {
    const inst = this.browsers.get(id)
    return inst ? await inst.getLoginInfo() : null
  }

  async refreshLoginCaptcha(id) {
    const inst = this.browsers.get(id)
    return inst ? await inst.refreshLoginCaptcha() : null
  }

  async submitLogin(id, credentials) {
    const inst = this.browsers.get(id)
    return inst
      ? await inst.submitLogin(credentials)
      : { success: false, message: '浏览器实例不存在' }
  }

  removeBrowser(id) {
    const inst = this.browsers.get(id)
    if (inst) inst.stop()
    this.browsers.delete(id)
    this._saveInstances()
  }


  renameBrowser(id, name) {
    const inst = this.browsers.get(id)
    if (inst) {
      inst.name = name
      this._saveInstances()
      return true
    }
    return false
  }

  async stopAll() {
    for (const inst of this.browsers.values()) {
      await inst.stop()
    }
    this._saveInstances()
  }

  getBrowserStatus(id) {
    const inst = this.browsers.get(id)
    return inst ? inst.getStatus() : null
  }

  getAllStatus() {
    return Array.from(this.browsers.values()).map(b => b.getStatus())
  }

  getConfig() {
    return { ...this.config }
  }

  updateConfig(updates) {
    const nextConfig = { ...this.config, ...updates }
    this._saveConfig(nextConfig)
    this.config = nextConfig
  }

  _loadConfig() {
    try {
      if (fs.existsSync(this.configPath)) {
        return JSON.parse(fs.readFileSync(this.configPath, 'utf-8'))
      }
    } catch (error) {
      console.error(`读取配置失败: ${this.configPath}`, error)
    }
    return {}
  }

  _saveConfig(config = this.config) {
    this._writeJson(this.configPath, config)
  }

  _loadInstances() {
    try {
      if (fs.existsSync(this.instancesPath)) {
        const items = JSON.parse(fs.readFileSync(this.instancesPath, 'utf-8')) || []
        let maxId = 0
        for (const item of items) {
          const id = item.browser_id
          const name = item.name || item.config?.name || null
          const realName = item.real_name || item.config?.realName || null
          const cfg = { ...this.config, ...(item.config || {}), name, realName }
          this.browsers.set(id, this._createInstance(id, cfg))
          if (id > maxId) maxId = id
        }
        this.nextId = maxId + 1
      }
    } catch (error) {
      console.error(`读取实例数据失败: ${this.instancesPath}`, error)
    }
  }

  _saveInstances() {
    const items = Array.from(this.browsers.entries()).map(([id, b]) => ({
      browser_id: id,
      name: b.name,
      real_name: b.realName,
      config: b.config,
    }))
    this._writeJson(this.instancesPath, items)
  }

  _createInstance(id, config) {
    return new BrowserInstance(id, config, this.dataDir, (browserId, realName) => {
      this._saveInstances()
      try {
        this.onIdentityChange?.(browserId, realName)
      } catch (error) {
        console.error('更新登录档案姓名失败', error)
      }
    })
  }

  _writeJson(filePath, value) {
    const temporaryPath = `${filePath}.${process.pid}.tmp`
    try {
      fs.writeFileSync(temporaryPath, JSON.stringify(value, null, 2), 'utf-8')
      fs.renameSync(temporaryPath, filePath)
    } catch (error) {
      try {
        if (fs.existsSync(temporaryPath)) fs.unlinkSync(temporaryPath)
      } catch (_) {}
      throw new Error(`保存应用数据失败: ${filePath}`, { cause: error })
    }
  }

  _migrateLegacyFile(filename, legacyDataDir) {
    if (!legacyDataDir) return
    const sourcePath = path.join(legacyDataDir, filename)
    const targetPath = path.join(this.dataDir, filename)
    if (sourcePath === targetPath || fs.existsSync(targetPath) || !fs.existsSync(sourcePath)) return

    try {
      const value = JSON.parse(fs.readFileSync(sourcePath, 'utf-8'))
      this._writeJson(targetPath, value)
    } catch (error) {
      console.error(`迁移旧应用数据失败: ${sourcePath}`, error)
    }
  }

  _migrateLegacyBrowserData(legacyDataDir) {
    const configuredDir = this.config.user_data_dir
    if (!legacyDataDir || !configuredDir || path.isAbsolute(configuredDir)) return

    const sourcePath = path.join(legacyDataDir, configuredDir)
    const targetPath = path.join(this.dataDir, configuredDir)
    if (sourcePath === targetPath || fs.existsSync(targetPath) || !fs.existsSync(sourcePath)) return

    try {
      fs.cpSync(sourcePath, targetPath, { recursive: true, errorOnExist: false })
    } catch (error) {
      console.error(`迁移旧浏览器数据失败: ${sourcePath}`, error)
    }
  }
}
