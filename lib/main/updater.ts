import { app, BrowserWindow } from 'electron'
import { updateElectronApp, UpdateSourceType } from 'update-electron-app'
import log from 'electron-log/main'

export class UpdateManager {
  private mainWindow: BrowserWindow | null = null
  private updateCheckInterval: NodeJS.Timeout | null = null

  constructor() {
    // Configure logging
    log.transports.file.level = 'info'
    log.transports.console.level = 'debug'
  }

  public setMainWindow(window: BrowserWindow) {
    this.mainWindow = window
  }

  public initialize() {
    // Get S3 bucket configuration from environment or use defaults
    const bucketName = process.env.S3_UPDATE_BUCKET || 'apo-internal-updates'
    const region = process.env.S3_UPDATE_REGION || 'us-east-1'

    // Build the S3 URL based on platform and architecture
    const baseUrl = `https://${bucketName}.s3.${region}.amazonaws.com/releases/${process.platform}-${process.arch}`

    log.info(`Initializing auto-updater with baseUrl: ${baseUrl}`)

    try {
      // Initialize update-electron-app with S3 static storage
      updateElectronApp({
        updateSource: {
          type: UpdateSourceType.StaticStorage,
          baseUrl: baseUrl,
        },
        updateInterval: '30 minutes',
        notifyUser: false, // We'll handle notifications ourselves for better UX
        logger: log,
      })

      // Set up event listeners for update lifecycle
      this.setupUpdateListeners()

      log.info('Auto-updater initialized successfully')
    } catch (error) {
      log.error('Failed to initialize auto-updater:', error)
      this.sendUpdateStatus('error', { message: 'Failed to initialize auto-updater' })
    }
  }

  private setupUpdateListeners() {
    // Listen for app events related to updates
    // @ts-expect-error - before-quit-for-update exists but isn't in Electron's type definitions
    app.on('before-quit-for-update', () => {
      log.info('App is quitting for update installation')
      this.sendUpdateStatus('installing', { message: 'Installing update, app will restart...' })
    })

    // Manually check for updates periodically and notify renderer
    this.startUpdateCheckInterval()
  }

  private startUpdateCheckInterval() {
    // Initial check after 10 seconds
    setTimeout(() => {
      this.checkForUpdates()
    }, 10000)

    // Then check every 30 minutes
    this.updateCheckInterval = setInterval(
      () => {
        this.checkForUpdates()
      },
      30 * 60 * 1000
    )
  }

  private async checkForUpdates() {
    log.info('Checking for updates...')
    this.sendUpdateStatus('checking', { message: 'Checking for updates...' })

    // Note: update-electron-app handles the actual checking internally
    // We're just notifying the UI about the state
    // The actual update download will happen automatically if available
  }

  public sendUpdateStatus(status: string, data?: any) {
    if (this.mainWindow && !this.mainWindow.isDestroyed()) {
      this.mainWindow.webContents.send('update-status', { status, data })
      log.info(`Update status sent to renderer: ${status}`, data)
    }
  }

  public requestUpdateCheck() {
    log.info('Manual update check requested')
    this.checkForUpdates()
  }

  public cleanup() {
    if (this.updateCheckInterval) {
      clearInterval(this.updateCheckInterval)
      this.updateCheckInterval = null
    }
  }
}

// Export singleton instance
export const updateManager = new UpdateManager()
