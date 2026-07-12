import path from 'path'
import fs from 'fs'
import { fileURLToPath } from 'url'
import { BrowserInstance } from './browser-instance.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const CONFIG_PATH = path.join(__dirname, '..', '..', 'config.json')
const INSTANCES_PATH = path.join(__dirname, '..', '..', 'instances.json')

const DEFAULT_CONFIG = {
  chrome_path: '',
  user_data_dir: 'user_data',
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
  constructor() {
    this.browsers = new Map()
    this.nextId = 1
    this.config = { ...DEFAULT_CONFIG, ...this._loadConfig() }
    this._loadInstances()
  }

  createBrowser(configOverrides = {}) {
    const id = this.nextId++
    const cfg = { ...this.config, ...configOverrides }
    const inst = new BrowserInstance(id, cfg)
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

  removeBrowser(id) {
    const inst = this.browsers.get(id)
    if (inst) inst.stop()
    this.browsers.delete(id)
    this._saveInstances()
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
    Object.assign(this.config, updates)
    this._saveConfig()
  }

  _loadConfig() {
    try {
      if (fs.existsSync(CONFIG_PATH)) {
        return JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf-8'))
      }
    } catch (_) {}
    return {}
  }

  _saveConfig() {
    try {
      fs.writeFileSync(CONFIG_PATH, JSON.stringify(this.config, null, 2), 'utf-8')
    } catch (_) {}
  }

  _loadInstances() {
    try {
      if (fs.existsSync(INSTANCES_PATH)) {
        const items = JSON.parse(fs.readFileSync(INSTANCES_PATH, 'utf-8')) || []
        let maxId = 0
        for (const item of items) {
          const id = item.browser_id
          const cfg = { ...this.config, ...(item.config || {}) }
          this.browsers.set(id, new BrowserInstance(id, cfg))
          if (id > maxId) maxId = id
        }
        this.nextId = maxId + 1
      }
    } catch (_) {}
  }

  _saveInstances() {
    try {
      const items = Array.from(this.browsers.entries()).map(([id, b]) => ({
        browser_id: id,
        config: b.config,
      }))
      fs.writeFileSync(INSTANCES_PATH, JSON.stringify(items, null, 2), 'utf-8')
    } catch (_) {}
  }
}
