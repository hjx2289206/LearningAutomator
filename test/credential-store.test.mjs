import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import test from 'node:test'

import { CredentialStore } from '../electron/storage/credential-store.js'

const fakeEncryption = {
  isEncryptionAvailable: () => true,
  encryptString: value => Buffer.from(`encrypted:${value}`, 'utf-8'),
  decryptString: value => value.toString('utf-8').replace(/^encrypted:/, ''),
}

test('encrypts, restores, labels and removes login profiles', () => {
  const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'learning-credentials-'))

  try {
    const store = new CredentialStore({ dataDir, encryption: fakeEncryption })
    store.save({ account: '510100000000000001', password: 'unique-password', browserId: 2 })
    store.save({ account: '510100000000000002', password: 'second-password', browserId: 8, name: '李四' })

    const savedText = fs.readFileSync(path.join(dataDir, 'credentials.json'), 'utf-8')
    assert.equal(savedText.includes('unique-password'), false)
    assert.equal(savedText.includes('second-password'), false)

    const profiles = store.list(2)
    assert.equal(profiles[0].account, '510100000000000001')
    assert.equal(profiles[0].preferred, true)
    assert.equal(profiles[0].password, undefined)
    assert.deepEqual(store.get('510100000000000001'), {
      account: '510100000000000001',
      name: null,
      password: 'unique-password',
    })

    assert.equal(store.updateNameForBrowser(2, '张三'), true)
    const restartedStore = new CredentialStore({ dataDir, encryption: fakeEncryption })
    assert.equal(restartedStore.list(2)[0].name, '张三')
    assert.equal(restartedStore.remove('510100000000000001'), true)
    assert.equal(restartedStore.get('510100000000000001'), null)
  } finally {
    fs.rmSync(dataDir, { recursive: true, force: true })
  }
})
