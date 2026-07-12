export class LearningAutomation {
  constructor(instance) {
    this.instance = instance
    this._learningStartedAt = null
  }

  async startLearning() {
    const inst = this.instance
    if (!inst.isDriverAlive()) return false

    this._learningStartedAt = Date.now()

    if (inst.config.auto_mute) await inst._muteAllMedia()
    inst.status = '学习页分析中'
    inst.currentAction = '正在分析页面视频...'
    await inst._sleep(3000)

    // 滚动页面
    try { await inst.page.evaluate(() => window.scrollTo(0, 200)) } catch (_) {}
    await inst._sleep(2000)

    let stats = await this._getVideoStats()
    if (stats.total === 0) {
      inst.currentAction = '未找到视频，等待页面加载...'
      await inst._sleep(10000)
      stats = await this._getVideoStats()
      if (stats.total === 0) { inst.currentAction = '未检测到视频内容'; return false }
    }

    const total = stats.total
    let attempts = 0
    const maxAttempts = total * 2

    // 第一个视频自动播放，直接秒课
    if (stats.incomplete > 0) {
      if (inst.config.auto_mute) await inst._muteAllMedia()
      inst.currentAction = '第一个视频已自动播放，正在秒课...'
      await this._learnVideo(null, 1, total, true)
      await inst._sleep(10000)
      stats = await this._getVideoStats()
      this._updateProgress(stats)
    }

    // 处理剩余视频（从第二个开始，逐个点击）
    while (this.instance.isRunning && attempts < maxAttempts && stats.incomplete > 0) {
      attempts++
      const next = await this._findNextIncomplete()
      if (!next) {
        inst.currentAction = '未找到未完成视频，重新检查...'
        await inst._sleep(8000)
        stats = await this._getVideoStats()
        this._updateProgress(stats)
        continue
      }

      if (inst.config.auto_mute) await inst._muteAllMedia()
      inst.currentAction = `学习第 ${stats.completed + 1}/${total} 个视频...`
      await this._learnVideo(next.index, stats.completed + 1, total, false)
      await inst._sleep(10000)
      stats = await this._getVideoStats()
      this._updateProgress(stats)
    }

    if (stats.completed >= total) {
      inst.status = '刷课完成'
      inst.currentAction = `所有课程已完成！(${stats.completed}/${total})`
    } else if (attempts >= maxAttempts) {
      inst.status = '刷课完成'
      inst.currentAction = `达到最大尝试次数 (${stats.completed}/${total})`
    }

    return true
  }

  async _learnVideo(videoIndex, index, total, isFirst) {
    const inst = this.instance
    if (!isFirst && videoIndex != null) {
      // 点击视频项
      try {
        await inst.page.evaluate((idx) => {
          const items = document.querySelectorAll('.videoList li.title, li.title')
          if (items[idx]) {
            items[idx].scrollIntoView({ block: 'center', behavior: 'smooth' })
          }
        }, videoIndex)
        await inst._sleep(1500)
        await inst.page.evaluate((idx) => {
          const items = document.querySelectorAll('.videoList li.title, li.title')
          if (items[idx]) items[idx].click()
        }, videoIndex)
        await inst._sleep(5000)
      } catch (e) {
        console.error('点击视频项失败:', e.message)
      }
    }

    // 等视频加载
    await inst._sleep(3000)

    // 秒课
    await this._miaoke()
    inst.currentAction = `已处理第 ${index}/${total} 个视频`
  }

  async _getVideoStats() {
    try {
      return await this.instance.page.evaluate(() => {
        const items = document.querySelectorAll('.videoList li.title, li.title')
        let total = 0, completed = 0, incomplete = 0
        for (const item of items) {
          const text = (item.textContent || '').trim()
          total++
          if (text.includes('已完成')) completed++
          else incomplete++
        }
        return {
          total,
          completed,
          incomplete,
          percentage: total > 0 ? Math.round(completed / total * 100) : 0,
        }
      })
    } catch (_) {
      return { total: 0, completed: 0, incomplete: 0, percentage: 0 }
    }
  }

  async _findNextIncomplete() {
    try {
      return await this.instance.page.evaluate(() => {
        const items = document.querySelectorAll('.videoList li.title, li.title')
        for (let i = 1; i < items.length; i++) {
          const text = (items[i].textContent || '').trim()
          if (text.includes('未完成')) return { index: i }
        }
        return null
      })
    } catch (_) {
      return null
    }
  }

  async _miaoke() {
    for (let i = 0; i < 3; i++) {
      const ok = await this.instance.page.evaluate(() => {
        const videos = document.querySelectorAll('video')
        if (videos.length === 0) return false
        const v = videos[0]
        if (v.duration && v.duration > 0) {
          v.currentTime = v.duration - 1
          if (v.paused) v.play().catch(() => {})
          return true
        }
        return false
      })
      if (ok) return true
      await this.instance._sleep(5000)
    }
    return false
  }

  _updateProgress(stats) {
    const inst = this.instance
    const completed = stats.completed
    const total = stats.total
    const percentage = stats.percentage

    // 计算 ETA
    let eta = null
    let etaSeconds = null
    if (this._learningStartedAt && completed > 0 && completed < total && percentage > 0) {
      const elapsed = (Date.now() - this._learningStartedAt) / 1000
      const avgPerVideo = elapsed / completed
      const remaining = total - completed
      etaSeconds = Math.round(avgPerVideo * remaining)
      if (etaSeconds < 60) {
        eta = `${etaSeconds}秒`
      } else if (etaSeconds < 3600) {
        const m = Math.floor(etaSeconds / 60)
        const s = etaSeconds % 60
        eta = `${m}分${s}秒`
      } else {
        const h = Math.floor(etaSeconds / 3600)
        const m = Math.round((etaSeconds % 3600) / 60)
        eta = `${h}小时${m}分`
      }
    } else if (completed >= total) {
      if (this._learningStartedAt) {
        const elapsed = Math.round((Date.now() - this._learningStartedAt) / 1000 / 60)
        eta = `已完成 (耗时约${elapsed}分)`
      } else {
        eta = '已完成'
      }
    }

    inst.progress = {
      current: completed,
      total,
      percentage,
      eta,
      eta_seconds: etaSeconds,
    }
  }
}