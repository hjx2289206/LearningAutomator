import { app, BrowserWindow, ipcMain } from 'electron'
import { spawn } from 'child_process'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

let mainWindow
let backendPort = 3001
let backendProcess = null
const isPackaged = app.isPackaged

function createWindow() {
  console.log('🚀 创建 Electron 窗口...')
  console.log('🔗 后端端口配置:', backendPort)

  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 1000,
    minHeight: 700,
    frame: false,
    titleBarStyle: 'hidden',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.mjs'),
    },
  })

  // 监听窗口状态变化并通知渲染进程
  mainWindow.on('maximize', () => {
    mainWindow.webContents.send('window-state-changed', 'maximized')
  })
  mainWindow.on('unmaximize', () => {
    mainWindow.webContents.send('window-state-changed', 'restored')
  })
  mainWindow.on('enter-full-screen', () => {
    mainWindow.webContents.send('window-state-changed', 'full-screen')
  })
  mainWindow.on('leave-full-screen', () => {
    mainWindow.webContents.send('window-state-changed', 'restored')
  })

  // 依次尝试多个候选端口，避免端口占用导致无法加载前端
  const candidateUrls = ['http://localhost:3000', 'http://localhost:3001']
  let idx = 0

  function loadVueApp() {
    if (isPackaged) {
      const filePath = path.join(__dirname, '..', 'dist', 'index.html')
      console.log('📦 以打包模式加载前端文件:', filePath)
      mainWindow.loadFile(filePath).then(() => {
        // 打包模式默认不打开 DevTools
        console.log('✅ 成功加载打包前端')

        // 加载完成后自动测试后端连接
        setTimeout(() => {
          console.log('🔄 自动测试后端连接...')
          mainWindow.webContents.executeJavaScript(`
            console.log('🧪 开始后端连接测试...');
            // 测试后端连接
            fetch('http://localhost:${backendPort}/api/health')
              .then(response => {
                console.log('📊 响应状态:', response.status);
                return response.json();
              })
              .then(data => {
                console.log('✅ 后端健康检查成功:', data);
                const alert = document.createElement('div');
                alert.style.cssText = 'position:fixed; top:10px; right:10px; background:#27ae60; color:white; padding:10px; border-radius:5px; z-index:9999;';
                alert.textContent = '✅ 后端连接成功';
                document.body.appendChild(alert);
                setTimeout(() => alert.remove(), 3000);
              })
              .catch(error => {
                console.error('❌ 后端连接失败:', error);
                const alert = document.createElement('div');
                alert.style.cssText = 'position:fixed; top:10px; right:10px; background:#e74c3c; color:white; padding:10px; border-radius:5px; z-index:9999;';
                alert.textContent = '❌ 后端连接失败 - 查看控制台';
                document.body.appendChild(alert);
                setTimeout(() => alert.remove(), 5000);
              });
          `)
        }, 3000)
      })
    } else {
      const url = candidateUrls[idx % candidateUrls.length]
      console.log('📡 尝试连接 Vue 开发服务器:', url)

      mainWindow
        .loadURL(url)
        .then(() => {
          console.log('✅ 成功加载 Vue 应用:', url)
          mainWindow.webContents.openDevTools()

          setTimeout(() => {
            console.log('🔄 自动测试后端连接...')
            mainWindow.webContents.executeJavaScript(`
              console.log('🧪 开始后端连接测试...');
              fetch('http://localhost:${backendPort}/api/health')
                .then(response => { console.log('📊 响应状态:', response.status); return response.json(); })
                .then(data => { console.log('✅ 后端健康检查成功:', data); })
                .catch(error => { console.error('❌ 后端连接失败:', error); });
            `)
          }, 3000)
        })
        .catch((err) => {
          console.log('❌ Vue 开发服务器连接失败:', err.message)
          idx += 1
          console.log('🕒 5秒后尝试下一个端口...')
          setTimeout(loadVueApp, 5000)
        })
    }
  }

  loadVueApp()
}

app.whenReady().then(() => {
  console.log('🎯 Electron app 准备就绪')
  // 启动 Python 后端服务（如果未运行）
  try {
    if (!backendProcess) {
      console.log('🟢 尝试启动后端进程...')
      const env = {
        ...process.env,
        PORT: String(backendPort),
        FLASK_DEBUG: 'false',
        PYTHONIOENCODING: 'utf-8',
        PYTHONUTF8: '1',
      }
      if (isPackaged) {
        // 生产环境：从 resourcesPath 启动打包后的后端可执行文件
        const backendExe = path.join(process.resourcesPath, 'backend.exe')
        console.log('📦 启动打包后端:', backendExe)
        backendProcess = spawn(backendExe, [], {
          cwd: process.resourcesPath,
          env,
          stdio: ['ignore', 'pipe', 'pipe'],
        })
      } else {
        // 开发环境：直接运行 Python 脚本
        backendProcess = spawn('python', ['backend/main.py'], {
          cwd: path.join(__dirname, '..'),
          env,
          stdio: ['ignore', 'pipe', 'pipe'],
        })
      }

      backendProcess.stdout.on('data', (data) => {
        const msg = data.toString()
        if (msg.trim()) console.log('📨 [backend]', msg.trim())
      })
      backendProcess.stderr.on('data', (data) => {
        const msg = data.toString()
        if (msg.trim()) console.error('⚠️ [backend]', msg.trim())
      })
      backendProcess.on('exit', (code) => {
        console.log(`🔚 后端进程退出，代码: ${code}`)
        backendProcess = null
      })
    }
  } catch (err) {
    console.error('❌ 启动后端失败:', err)
  }
  createWindow()

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', function () {
  // 退出时清理后端进程
  try {
    if (backendProcess && !backendProcess.killed) {
      console.log('🛑 关闭后端进程...')
      backendProcess.kill()
      backendProcess = null
    }
  } catch (err) {
    console.error('⚠️ 关闭后端进程时出错:', err)
  }
  if (process.platform !== 'darwin') app.quit()
})

ipcMain.handle('get-backend-port', () => {
  console.log('📡 前端请求后端端口:', backendPort)
  return backendPort
})

ipcMain.on('window-minimize', () => {
  mainWindow.minimize()
})

ipcMain.on('window-maximize', () => {
  if (mainWindow.isMaximized()) {
    mainWindow.unmaximize()
  } else {
    mainWindow.maximize()
  }
})

ipcMain.on('window-close', () => {
  mainWindow.close()
})
