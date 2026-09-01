import { BrowserWindow, shell, app } from 'electron'
import { join } from 'path'
import { createWindowManager } from 'electron-conveyor/main'
import appIcon from '@/resources/build/icon.png?asset'
import { setupEvents } from '@/conveyor/router'

/** Tracks every window by label; the substrate for cross-window targeting (`ctx.windows`). */
export const windows = createWindowManager()

let windowCount = 0

/** Open a new tracked app window. `page` deep-links it onto an app page (via the URL hash). */
export function openAppWindow(page?: string): BrowserWindow {
  windowCount += 1
  const label = windowCount === 1 ? 'main' : `window-${windowCount}`
  return windows.register(label, createAppWindow(page))
}

/**
 * Create an app window. `hash` deep-links it: the renderer receives it as `location.hash`, so a
 * window can open straight onto a given route/view instead of the app's default.
 */
export function createAppWindow(hash?: string): BrowserWindow {
  // Create the main window.
  const mainWindow = new BrowserWindow({
    width: 1240,
    height: 780,
    minWidth: 720,
    minHeight: 520,
    show: false,
    backgroundColor: '#0e1011',
    icon: appIcon,
    frame: false,
    titleBarStyle: 'hiddenInset',
    title: 'Electron React App',
    webPreferences: {
      preload: join(__dirname, '../preload/preload.js'),
      // The conveyor preload is sandbox-compatible (contextBridge + ipcRenderer only), so the
      // renderer runs fully sandboxed — keep it that way.
      sandbox: true,
    },
  })

  // Wire per-window push events. Procedure handlers are registered once, globally, via the
  // `@/conveyor/router` import side-effect and resolve the calling window from each invoke.
  setupEvents(mainWindow)

  mainWindow.on('ready-to-show', () => {
    mainWindow.show()
  })

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    // Only hand http(s) URLs to the OS — never arbitrary protocol handlers.
    try {
      const { protocol } = new URL(url)
      if (protocol === 'https:' || protocol === 'http:') shell.openExternal(url)
    } catch {
      // malformed URL — ignore
    }
    return { action: 'deny' }
  })

  // HMR for renderer base on electron-vite cli.
  // Load the remote URL for development or the local html file for production.
  if (!app.isPackaged && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(`${process.env['ELECTRON_RENDERER_URL']}${hash ? `#${hash}` : ''}`)
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'), hash ? { hash } : undefined)
  }

  return mainWindow
}
