// API服务基础类
class ApiService {
  protected baseURL = ''

  async init() {
    try {
      const port = await (window as any)?.electronAPI?.getBackendPort?.()
      const resolvedPort = port ?? 3001
      this.baseURL = `http://localhost:${resolvedPort}`
    } catch (err) {
      // 非 Electron 环境或桥失败时回退至默认端口
      this.baseURL = 'http://localhost:3001'
    }
  }

  protected async request(endpoint: string, options: RequestInit = {}) {
    try {
      // 确保已初始化 baseURL
      if (!this.baseURL) {
        await this.init()
      }
      console.log(`[API] ${options.method || 'GET'} ${this.baseURL}${endpoint}`)
      const response = await fetch(`${this.baseURL}${endpoint}`, {
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
        ...options,
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      return await response.json()
    } catch (error) {
      console.error(`API request failed: ${endpoint}`, error)
      throw error
    }
  }
}

// 浏览器实例服务
export class BrowserService extends ApiService {
  async getBrowsers() {
    const data = await this.request('/api/browsers')
    return data.success ? data.browsers : []
  }

  async createBrowser(config: any = {}) {
    const data = await this.request('/api/browsers', {
      method: 'POST',
      body: JSON.stringify({ config }),
    })
    return data
  }

  async startBrowser(browserId: number) {
    const data = await this.request(`/api/browsers/${browserId}/start`, {
      method: 'POST',
    })
    return data
  }

  async stopBrowser(browserId: number) {
    const data = await this.request(`/api/browsers/${browserId}/stop`, {
      method: 'POST',
    })
    return data
  }

  async removeBrowser(browserId: number) {
    const data = await this.request(`/api/browsers/${browserId}`, {
      method: 'DELETE',
    })
    return data
  }

  async stopAllBrowsers() {
    const data = await this.request('/api/browsers/stop-all', {
      method: 'POST',
    })
    return data
  }

  async getBrowserStatus(browserId: number) {
    const data = await this.request(`/api/browsers/${browserId}/status`)
    return data.success ? data.status : null
  }
}

// 配置服务
export class ConfigService extends ApiService {
  async getConfig() {
    const data = await this.request('/api/config')
    return data.success ? data.config : null
  }

  async updateConfig(config: any) {
    const data = await this.request('/api/config', {
      method: 'POST',
      body: JSON.stringify(config),
    })
    return data
  }
}

// 题库服务
export class QuestionBankService extends ApiService {
  async getStats() {
    const data = await this.request('/api/question-bank/stats')
    return data.success ? data.stats : null
  }

  async getQuestions() {
    const data = await this.request('/api/question-bank/items')
    return data.success ? data.questions : []
  }

  async searchQuestions(query: string) {
    const data = await this.request(`/api/question-bank/search?query=${encodeURIComponent(query)}`)
    return data.success ? data.questions : []
  }

  async deleteQuestion(questionId: string | number) {
    const data = await this.request(`/api/question-bank/${questionId}`, { method: 'DELETE' })
    return data
  }

  async exportQuestions() {
    const data = await this.request('/api/question-bank/export')
    return data.success ? data.data : {}
  }
}

// 日志服务
export class LogService extends ApiService {
  async getLogs() {
    const data = await this.request('/api/logs')
    return data.success ? data.logs : []
  }

  async clearLogs() {
    // 清空日志API - 需要后端实现
    return { success: true }
  }
}

// 健康检查服务
export class HealthService extends ApiService {
  async checkHealth() {
    try {
      const data = await this.request('/api/health')
      return data
    } catch (error) {
      throw new Error('后端服务不可用')
    }
  }
}

// 导出服务实例
export const browserService = new BrowserService()
export const configService = new ConfigService()
export const questionBankService = new QuestionBankService()
export const logService = new LogService()
export const healthService = new HealthService()
