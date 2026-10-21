import { BrowserWindow, shell, app, screen } from 'electron'
import { join } from 'path'
import { createWindowManager } from 'electron-conveyor/main'
import appIcon from '@/resources/build/icon.png?asset'
import { setupEvents } from '@/conveyor/router'

/** Tracks every window by label; the substrate for cross-window targeting (`ctx.windows`). */
export const windows = createWindowManager()

let windowCount = 0

/** Size a new window opens at, in px. */
const WINDOW_WIDTH = 1100
const WINDOW_HEIGHT = 768

/** How far a window is shifted from the one it was opened from, in px, so both stay visible. */
const CASCADE_OFFSET = 40

/**
 * Where a window opened from `opener` goes: nudged down and right, or up and left when that would
 * push it past the edge of the display. Without it Electron centers every new window, which lands
 * exactly on top of the last one.
 */
function cascadeFrom(opener: BrowserWindow): { x: number; y: number } {
  const { x, y } = opener.getBounds()
  const area = screen.getDisplayMatching(opener.getBounds()).workArea
  const fitsRight = x + CASCADE_OFFSET + WINDOW_WIDTH <= area.x + area.width
  const fitsBelow = y + CASCADE_OFFSET + WINDOW_HEIGHT <= area.y + area.height

  return {
    x: x + (fitsRight ? CASCADE_OFFSET : -CASCADE_OFFSET),
    y: y + (fitsBelow ? CASCADE_OFFSET : -CASCADE_OFFSET),
  }
}

/**
 * Open a new tracked app window. `page` deep-links it onto an app page (via the URL hash), and
 * `opener` is the window it was opened from, which the new one is offset from.
 */
export function openAppWindow(page?: string, opener?: BrowserWindow | null): BrowserWindow {
  windowCount += 1
  const label = windowCount === 1 ? 'main' : `window-${windowCount}`
  const anchor = opener ?? BrowserWindow.getFocusedWindow()
  return windows.register(label, createAppWindow(page, anchor ? cascadeFrom(anchor) : undefined))
}

/**
 * Create an app window. `hash` deep-links it: the renderer receives it as `location.hash`, so a
 * window can open straight onto a given route/view instead of the app's default. `position` places
 * it on screen, and leaves it centered when omitted.
 */
export function createAppWindow(hash?: string, position?: { x: number; y: number }): BrowserWindow {
  // Create the main window.
  const mainWindow = new BrowserWindow({
    width: WINDOW_WIDTH,
    height: WINDOW_HEIGHT,
    ...position,
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
