import { app, shell, BrowserWindow, ipcMain } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import { Client, LocalAuth } from 'whatsapp-web.js'
import qrcode from 'qrcode'
import icon from '../../resources/icon.ico?asset'

function createWindow(): BrowserWindow {
  const mainWindow = new BrowserWindow({
    width: 900,
    height: 700,
    show: false,
    autoHideMenuBar: true,
    ...(process.platform === 'linux' ? { icon } : {}),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow.show()
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }

  return mainWindow
}

app.whenReady().then(() => {
  electronApp.setAppUserModelId('com.electron')
  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  const mainWindow = createWindow()

  const waClient = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: {
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    }
  })

  waClient.on('qr', async (qr) => {
    try {
      const qrImage = await qrcode.toDataURL(qr)
      mainWindow.webContents.send('wa-qr', qrImage)
    } catch (err) {
      console.error('Erro ao converter QR Code', err)
    }
  })

  waClient.on('ready', () => {
    mainWindow.webContents.send('wa-ready')
  })

  waClient.initialize()

  ipcMain.on('start-sending', async (_, { numbers, message }) => {
    mainWindow.webContents.send('wa-status', 'Iniciando disparos...')

    for (let i = 0; i < numbers.length; i++) {
      const rawNumber = numbers[i].replace(/\D/g, '') 

      if (!rawNumber) continue;

      try {
        mainWindow.webContents.send('wa-status', `Validando número ${rawNumber}... (${i + 1}/${numbers.length})`)
        
        const numberId = await waClient.getNumberId(rawNumber)

        if (!numberId) {
          console.warn(`Número ${rawNumber} não possui WhatsApp.`)
          mainWindow.webContents.send('wa-status', `⚠️ Número ${rawNumber} inválido. Pulando...`)
          continue 
        }

        mainWindow.webContents.send('wa-status', `Enviando para ${rawNumber}...`)
        await waClient.sendMessage(numberId._serialized, message)
        
        if (i < numbers.length - 1) {
          const delay = Math.floor(Math.random() * (20000 - 10000 + 1) + 10000)
          mainWindow.webContents.send('wa-status', `Pausa de segurança de ${delay/1000}s...`)
          await new Promise(resolve => setTimeout(resolve, delay))
        }
      } catch (error) {
        console.error(`Erro ao processar ${rawNumber}:`, error)
      }
    }

    mainWindow.webContents.send('wa-status', '✅ Todos os disparos foram concluídos com sucesso!')
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})