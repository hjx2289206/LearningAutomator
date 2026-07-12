export class LearningAutomation {
  constructor(instance) {
    this.instance = instance
  }

  async startLearning() {
    const inst = this.instance
    if (!inst.isDriverAlive()) {
      inst.status = '刷课失败'
      inst.currentAction = '浏览器未连接或已关闭'
      return false
    }

    inst.status = '刷课中'
    inst.currentAction = '开始检测视频进度'

    let stats = await this._getVideoStats()
    if (stats.total === 0) {
      inst.currentAction = '未找到视频，等待页面加载...'
      await inst._sleep(10000)
      stats = await this._getVideoStats()
      if (stats.total === 0) {
        inst.currentAction = '未检测到视频内容'
        return false
      }
    }

    this._updateProgress(stats)
    const maxAttempts = inst.config.max_learning_attempts || 100
    const checkInterval = (inst.config.learning_check_interval || 10) * 1000

    for (let i = 0; i < maxAttempts; i++) {
      if (!inst.isRunning) break
      if (!inst.isDriverAlive()) {
        inst.status = '刷课失败'
        inst.currentAction = '浏览器已关闭或驱动断开'
        break
      }

      stats = await this._getVideoStats()
      this._updateProgress(stats)

      inst.currentAction = `刷课进度: ${stats.completed}/${stats.total} (${stats.percentage}%)`

      if (stats.completed >= stats.total) {
        inst.status = '刷课完成'
        inst.currentAction = '所有课程已完成！'
        return true
      }

      const ok = await this._miaoke()
      inst.currentAction = ok
        ? `秒课成功 - 进度: ${stats.completed}/${stats.total}`
        : `秒课失败，等待重试 - 进度: ${stats.completed}/${stats.total}`

      // 检查是否有视频需要切到下一个
      if (stats.completed > 0 && stats.currentVideoDone) {
        await this._clickNextVideo(stats)
      }

      await inst._sleep(checkInterval)
    }

    inst.status = '刷课完成'
    inst.currentAction = `刷课结束 - 最终进度: ${inst.progress.current}/${inst.progress.total}`
    return true
  }

  async _getVideoStats() {
    try {
      return await this.instance.page.evaluate(() => {
        const videoItems = document.querySelectorAll('.videoList li.title, li.title')
        const result = { total: 0, completed: 0, incomplete: 0, currentVideoDone: false }

        for (const item of videoItems) {
          const text = item.textContent || item.innerText || ''
          result.total++
          if (text.includes('已完成')) result.completed++
          else result.incomplete++
        }

        // 检查当前正在播放的视频是否已到末尾
        const videos = document.querySelectorAll('video')
        if (videos.length > 0 && videos[0].duration) {
          const v = videos[0]
          result.currentVideoDone = (v.duration - v.currentTime) < 2
        }

        result.percentage = result.total > 0
          ? Math.round((result.completed / result.total) * 100)
          : 0
        return result
      })
    } catch (_) {
      return { total: 0, completed: 0, incomplete: 0, percentage: 0, currentVideoDone: false }
    }
  }

  async _miaoke() {
    try {
      return await this.instance.page.evaluate(() => {
        const videos = document.querySelectorAll('video')
        if (videos.length === 0) return false
        const video = videos[0]
        if (video.duration && video.duration > 0) {
          video.currentTime = video.duration - 1
          if (video.paused) video.play().catch(() => {})
          return true
        }
        return false
      })
    } catch (_) {
      return false
    }
  }

  async _clickNextVideo(stats) {
    try {
      // 尝试点击"下一节"或类似按钮
      await this.instance.page.evaluate(() => {
        const btns = Array.from(document.querySelectorAll('a, button, span, div'))
        for (const b of btns) {
          const text = (b.textContent || '').trim()
          if (text.includes('下一节') || text.includes('下一讲') || text.includes('继续')) {
            b.click()
            return true
          }
        }
        return false
      })
    } catch (_) {}
  }

  _updateProgress(stats) {
    this.instance.progress = {
      current: stats.completed,
      total: stats.total,
      percentage: stats.percentage,
    }
  }
}
