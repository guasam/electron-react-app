import { app, BrowserWindow, dialog, type IpcMainInvokeEvent } from 'electron'
import { electronApp, optimizer } from '@electron-toolkit/utils'
import { join, resolve, isAbsolute } from 'node:path'
import { mkdirSync } from 'node:fs'
import { createAppWindows } from './app'
import { registerAppSchemes, registerAppProtocols } from './protocols'
import { isAllowedCaller, isAppDocument } from './sender-policy'
import { openDatabase } from './infrastructure/database/database'
import { createBusinessHost, type BusinessHost } from './bootstrap/container'
import { publicFailure } from './bootstrap/operations'
import { registerRouter } from '../../conveyor/router'
import { QuitCoordinator } from './bootstrap/lifecycle'

if (process.platform === 'linux') app.commandLine.appendSwitch('password-store', 'gnome-libsecret')
registerAppSchemes()
const profile =
  process.env.STARTER_PROFILE_DIRECTORY ??
  (app.isPackaged ? app.getPath('userData') : `${app.getPath('userData')}-development`)
if (!isAbsolute(profile)) throw new Error('STARTER_PROFILE_DIRECTORY must be absolute.')
mkdirSync(profile, { recursive: true })
app.setPath('userData', profile)
const ownsProfile = app.requestSingleInstanceLock()
let business: BusinessHost | undefined, startup: Promise<void> | undefined
const lifecycle = new QuitCoordinator(
  async () => {
    await startup
    await business?.shutdown()
  },
  () => app.quit(),
  (error) => console.error('Shutdown failed:', error)
)
if (!ownsProfile) app.quit()
else {
  app.on('browser-window-created', (_, window) => optimizer.watchWindowShortcuts(window))
  startup = app
    .whenReady()
    .then(async () => {
      if (lifecycle.isStopping) return
      electronApp.setAppUserModelId('com.electron.business-starter')
      const entry =
        !app.isPackaged && process.env.ELECTRON_RENDERER_URL
          ? new URL(process.env.ELECTRON_RENDERER_URL).href
          : 'app://starter/index.html'
      registerAppProtocols(join(__dirname, '../renderer'), join(__dirname, '../../resources'))
      const protectedDirectory = join(profile, 'database')
      const database = await openDatabase({
        filename: join(protectedDirectory, 'app.sqlite'),
        migrationsFolder: app.isPackaged ? join(process.resourcesPath, 'drizzle') : resolve(__dirname, '../../drizzle'),
      })
      if (lifecycle.isStopping) {
        database.close()
        return
      }
      try {
        business = createBusinessHost(database, protectedDirectory)
        const windows = createAppWindows(entry)
        const allowed = (event: IpcMainInvokeEvent) => {
          const sender = event.sender,
            frame = event.senderFrame
          return (
            !sender.isDestroyed() &&
            !!frame &&
            isAllowedCaller({
              registered: windows.manager.all().some((window) => window.webContents === sender),
              topFrame: frame === sender.mainFrame,
              senderUrl: sender.getURL(),
              frameUrl: frame.url,
              entry,
            })
          )
        }
        registerRouter(
          { windows: windows.manager, openWindow: windows.open, appStartedAt: Date.now(), business },
          allowed,
          (url) => isAppDocument(url, entry)
        )
        windows.open()
        app.on('second-instance', () => {
          const win = windows.manager.all()[0]
          if (win) {
            if (win.isMinimized()) win.restore()
            win.focus()
          }
        })
        app.on('activate', () => {
          if (!BrowserWindow.getAllWindows().length && !lifecycle.isStopping) windows.open()
        })
      } catch (error) {
        await business?.shutdown()
        database.close()
        throw error
      }
    })
    .catch((error) => {
      console.error('Startup failed:', error)
      const failure = publicFailure(error)
      if (!lifecycle.isStopping)
        dialog.showErrorBox(
          'Unable to start',
          `${failure.message}\nYour data has not been reset. See docs/database-recovery.md for recovery instructions.`
        )
      app.exit(1)
    })
}
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
app.on('before-quit', (event) => {
  if (ownsProfile) lifecycle.beforeQuit(event)
})
