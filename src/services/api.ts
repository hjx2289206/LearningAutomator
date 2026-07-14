const api = (window as any).electronAPI

export async function getBrowsers() {
  const res = await api.getBrowsersStatus()
  return res.success ? (res.browsers || []) : []
}

export async function createBrowser(config = {}) {
  return await api.createBrowser(config)
}

export async function startBrowser(id: number) {
  return await api.startBrowser(id)
}

export async function getLoginInfo(id: number) {
  const res = await api.getLoginInfo(id)
  return res.success ? res.login : null
}

export async function refreshLoginCaptcha(id: number) {
  const res = await api.refreshLoginCaptcha(id)
  return res.success ? res.captcha_image : null
}

export async function loginBrowser(
  id: number,
  credentials: { account: string; password: string; verificationCode: string },
) {
  const payload = {
    account: String(credentials.account || ''),
    password: String(credentials.password || ''),
    verificationCode: String(credentials.verificationCode || ''),
  }
  return await api.loginBrowser(id, payload)
}

export async function stopBrowser(id: number) {
  return await api.stopBrowser(id)
}

export async function removeBrowser(id: number) {
  return await api.removeBrowser(id)
}

export async function stopAllBrowsers() {
  return await api.stopAllBrowsers()
}

export async function renameBrowser(id: number, name: string) {
  const res = await api.renameBrowser(id, name)
  return res.success
}

export async function getConfig() {
  const res = await api.getConfig()
  return res.success ? (res.config || null) : null
}

export async function updateConfig(config: Record<string, unknown>) {
  const res = await api.updateConfig(JSON.parse(JSON.stringify(config)))
  return res.success ? (res.config || null) : null
}
