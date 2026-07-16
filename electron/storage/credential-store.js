import fs from 'fs'
import path from 'path'

export class CredentialStore {
  constructor({ dataDir, encryption }) {
    this.filePath = path.join(dataDir, 'credentials.json')
    this.encryption = encryption
    fs.mkdirSync(dataDir, { recursive: true })
  }

  list(browserId = null) {
    return this._load()
      .map(profile => ({
        account: profile.account,
        name: profile.name || null,
        preferred: Number.isInteger(browserId) && profile.browser_ids.includes(browserId),
        updated_at: profile.updated_at,
      }))
      .sort((a, b) => Number(b.preferred) - Number(a.preferred) || b.updated_at.localeCompare(a.updated_at))
  }

  get(account) {
    const normalizedAccount = String(account || '').trim()
    const profile = this._load().find(item => item.account === normalizedAccount)
    if (!profile) return null

    this._assertEncryptionAvailable()
    return {
      account: profile.account,
      name: profile.name || null,
      password: this.encryption.decryptString(Buffer.from(profile.password_encrypted, 'base64')),
    }
  }

  save({ account, password, browserId, name = null }) {
    const normalizedAccount = String(account || '').trim()
    const normalizedPassword = String(password || '')
    if (!normalizedAccount || !normalizedPassword) throw new Error('账号和密码不能为空')

    this._assertEncryptionAvailable()
    const profiles = this._load()
    const existing = profiles.find(item => item.account === normalizedAccount)
    const browserIds = new Set(existing?.browser_ids || [])
    if (Number.isInteger(browserId)) browserIds.add(browserId)

    const nextProfile = {
      account: normalizedAccount,
      name: String(name || existing?.name || '').trim() || null,
      password_encrypted: this.encryption.encryptString(normalizedPassword).toString('base64'),
      browser_ids: [...browserIds],
      updated_at: new Date().toISOString(),
    }
    const nextProfiles = profiles.filter(item => item.account !== normalizedAccount)
    nextProfiles.push(nextProfile)
    this._write(nextProfiles)
    return { account: nextProfile.account, name: nextProfile.name }
  }

  updateNameForBrowser(browserId, name) {
    const normalizedName = String(name || '').trim()
    if (!Number.isInteger(browserId) || !normalizedName) return false

    const profiles = this._load()
    let changed = false
    for (const profile of profiles) {
      if (profile.browser_ids.includes(browserId) && profile.name !== normalizedName) {
        profile.name = normalizedName
        profile.updated_at = new Date().toISOString()
        changed = true
      }
    }
    if (changed) this._write(profiles)
    return changed
  }

  remove(account) {
    const normalizedAccount = String(account || '').trim()
    const profiles = this._load()
    const nextProfiles = profiles.filter(item => item.account !== normalizedAccount)
    if (profiles.length === nextProfiles.length) return false
    this._write(nextProfiles)
    return true
  }

  _assertEncryptionAvailable() {
    if (!this.encryption?.isEncryptionAvailable()) {
      throw new Error('系统安全存储不可用，无法安全保存密码')
    }
  }

  _load() {
    try {
      if (!fs.existsSync(this.filePath)) return []
      const data = JSON.parse(fs.readFileSync(this.filePath, 'utf-8'))
      if (!Array.isArray(data?.profiles)) return []
      return data.profiles
        .filter(item => item && typeof item.account === 'string' && typeof item.password_encrypted === 'string')
        .map(item => ({
          ...item,
          browser_ids: Array.isArray(item.browser_ids)
            ? item.browser_ids.filter(Number.isInteger)
            : [],
          updated_at: typeof item.updated_at === 'string' ? item.updated_at : '',
        }))
    } catch (error) {
      console.error(`读取登录档案失败: ${this.filePath}`, error)
      return []
    }
  }

  _write(profiles) {
    const temporaryPath = `${this.filePath}.${process.pid}.tmp`
    try {
      fs.writeFileSync(
        temporaryPath,
        JSON.stringify({ version: 1, profiles }, null, 2),
        { encoding: 'utf-8', mode: 0o600 },
      )
      fs.renameSync(temporaryPath, this.filePath)
      fs.chmodSync(this.filePath, 0o600)
    } catch (error) {
      try {
        if (fs.existsSync(temporaryPath)) fs.unlinkSync(temporaryPath)
      } catch (_) {}
      throw new Error(`保存登录档案失败: ${this.filePath}`, { cause: error })
    }
  }
}
