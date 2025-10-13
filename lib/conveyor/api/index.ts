import { electronAPI } from '@electron-toolkit/preload'
import { AppApi } from './app-api'
import { WindowApi } from './window-api'
import { UpdaterApi } from './updater-api'
import { WorkflowApi } from './workflow-api'

export const conveyor = {
  app: new AppApi(electronAPI),
  window: new WindowApi(electronAPI),
  updater: new UpdaterApi(electronAPI),
  workflow: new WorkflowApi(electronAPI),
}

export type ConveyorApi = typeof conveyor
