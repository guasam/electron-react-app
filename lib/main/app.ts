import { BrowserWindow, shell } from 'electron'
import { join } from 'node:path'
import { createWindowManager } from 'electron-conveyor/main'
import appIcon from '@/resources/build/icon.png?asset'
import { setupWindowEvents } from '../../conveyor/modules/window'
import { isAppDocument } from './sender-policy'

export function createAppWindows(entry: string) {
  const manager = createWindowManager()
  let count = 0
  const open = (page?: string): BrowserWindow => {
    const win = new BrowserWindow({
      width: 1100,
      height: 768,
      minWidth: 720,
      minHeight: 520,
      show: false,
      backgroundColor: '#0e1011',
      icon: appIcon,
      frame: false,
      titleBarStyle: 'hiddenInset',
      title: 'Electron Business Starter',
      webPreferences: {
        preload: join(__dirname, '../preload/preload.js'),
        sandbox: true,
        contextIsolation: true,
        nodeIntegration: false,
      },
    })
    manager.register(`window-${++count}`, win)
    setupWindowEvents(win)
    win.once('ready-to-show', () => win.show())
    win.webContents.on('will-navigate', (event, url) => {
      if (!isAppDocument(url, entry)) event.preventDefault()
    })
    win.webContents.on('will-frame-navigate', (event) => {
      if (!event.isMainFrame || !isAppDocument(event.url, entry)) event.preventDefault()
    })
    win.webContents.setWindowOpenHandler(({ url }) => {
      try {
        const parsed = new URL(url)
        if (['https:', 'http:'].includes(parsed.protocol) && !parsed.username && !parsed.password)
          void shell.openExternal(parsed.href).catch(console.error)
      } catch {
        /* Invalid links are ignored. */
      }
      return { action: 'deny' }
    })
    void win.loadURL(`${entry}${page ? `#${encodeURIComponent(page)}` : ''}`).catch(console.error)
    return win
  }
  return { manager, open }
}
