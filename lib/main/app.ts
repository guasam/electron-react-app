import { BrowserWindow, shell, app } from 'electron'
import { join } from 'path'
import appIcon from '@/resources/build/icon.png?asset'
import { registerResourcesProtocol } from './protocols'
import { registerWindowHandlers } from '@/lib/conveyor/handlers/window-handler'
import { registerAppHandlers } from '@/lib/conveyor/handlers/app-handler'
import { registerUpdaterHandlers } from '@/lib/conveyor/handlers/updater-handler'
import { registerWorkflowHandlers } from '@/lib/conveyor/handlers/workflow-handler'
import { updateManager } from './updater'
import { initializeServices, serviceManager } from './services/service-manager'
import type { EventBusService } from './services/core/event-bus.service'
import log from 'electron-log/main'

export async function createAppWindow(): Promise<void> {
  // Initialize services first
  try {
    await initializeServices()
  } catch (error) {
    log.error('Failed to initialize services:', error)
    throw error
  }

  // Register custom protocol for resources
  registerResourcesProtocol()

  // Create the main window.
  const mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 900,
    minHeight: 670,
    show: false,
    backgroundColor: '#1c1c1c',
    icon: appIcon,
    frame: false,
    titleBarStyle: 'hiddenInset',
    title: 'Electron React App',
    maximizable: true,
    resizable: true,
    webPreferences: {
      preload: join(__dirname, '../preload/preload.js'),
      sandbox: false,
    },
  })

  // Register IPC events for the main window.
  registerWindowHandlers(mainWindow)
  registerAppHandlers(app)
  registerUpdaterHandlers()
  registerWorkflowHandlers()

  // Set the main window for the update manager
  updateManager.setMainWindow(mainWindow)

  // Set the main window for the event bus
  if (serviceManager.has('eventBus')) {
    const eventBus = serviceManager.get<EventBusService>('eventBus')
    eventBus.setMainWindow(mainWindow)
  }

  mainWindow.on('ready-to-show', () => {
    mainWindow.show()
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  // HMR for renderer base on electron-vite cli.
  // Load the remote URL for development or the local html file for production.
  if (!app.isPackaged && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}
