import { electronAPI } from '@electron-toolkit/preload'
import { AppApi } from './app-api'
import { WindowApi } from './window-api'
import { UpdaterApi } from './updater-api'

export const conveyor = {
  app: new AppApi(electronAPI),
  window: new WindowApi(electronAPI),
  updater: new UpdaterApi(electronAPI),
}

export type ConveyorApi = typeof conveyor
