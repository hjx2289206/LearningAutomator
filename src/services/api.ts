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

export async function stopBrowser(id: number) {
  return await api.stopBrowser(id)
}

export async function removeBrowser(id: number) {
  return await api.removeBrowser(id)
}

export async function stopAllBrowsers() {
  return await api.stopAllBrowsers()
}

export async function getConfig() {
  const res = await api.getConfig()
  return res.success ? (res.config || null) : null
}

export async function updateConfig(config: Record<string, unknown>) {
  const res = await api.updateConfig(JSON.parse(JSON.stringify(config)))
  return res.success ? (res.config || null) : null
}
