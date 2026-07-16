import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import test from 'node:test'

import { BrowserManager } from '../electron/automation/browser-manager.js'

test('migrates legacy data and restores changes after restart', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'learning-automator-'))
  const legacyDataDir = path.join(root, 'legacy')
  const dataDir = path.join(root, 'application-data')

  try {
    fs.mkdirSync(path.join(legacyDataDir, 'user_data', 'profile_4'), { recursive: true })
    fs.writeFileSync(
      path.join(legacyDataDir, 'config.json'),
      JSON.stringify({ user_data_dir: 'user_data', monitor_interval: 17 }),
    )
    fs.writeFileSync(
      path.join(legacyDataDir, 'instances.json'),
      JSON.stringify([{ browser_id: 4, config: { name: '旧实例' } }]),
    )
    fs.writeFileSync(path.join(legacyDataDir, 'user_data', 'profile_4', 'marker'), 'profile')

    const identityChanges = []
    const manager = new BrowserManager({
      dataDir,
      legacyDataDir,
      onIdentityChange: (browserId, realName) => identityChanges.push([browserId, realName]),
    })
    assert.equal(manager.getConfig().monitor_interval, 17)
    assert.equal(manager.getAllStatus()[0].name, '旧实例')
    assert.equal(fs.readFileSync(path.join(dataDir, 'user_data', 'profile_4', 'marker'), 'utf-8'), 'profile')

    manager.updateConfig({ monitor_interval: 23 })
    assert.equal(manager.renameBrowser(4, '持久化实例'), true)
    const existingInstance = manager.browsers.get(4)
    existingInstance.realName = '张三'
    existingInstance.onIdentityChange(4, '张三')
    assert.deepEqual(identityChanges, [[4, '张三']])
    assert.equal(manager.createBrowser({ name: '新增实例' }), 5)

    const restartedManager = new BrowserManager({ dataDir })
    assert.equal(restartedManager.getConfig().monitor_interval, 23)
    assert.deepEqual(
      restartedManager.getAllStatus().map(instance => [instance.browser_id, instance.name, instance.real_name]),
      [[4, '持久化实例', '张三'], [5, '新增实例', null]],
    )
  } finally {
    fs.rmSync(root, { recursive: true, force: true })
  }
})
