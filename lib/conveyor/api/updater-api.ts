import { ConveyorApi } from '@/lib/preload/shared'
import type { ElectronAPI } from '@electron-toolkit/preload'

export class UpdaterApi extends ConveyorApi {
  constructor(electronApi: ElectronAPI) {
    super(electronApi)
  }

  checkForUpdates = () => this.invoke('updater-check')
  getUpdateStatus = () => this.invoke('updater-get-status')

  // Register for update status events sent from main process
  onUpdateStatus = (callback: (event: any, data: any) => void) => {
    this.renderer.on('update-status', callback)
    return () => this.renderer.removeListener('update-status', callback)
  }
}