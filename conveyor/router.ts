import { ipcMain, type IpcMainInvokeEvent } from 'electron'
import { createRouter, createEmitter, ConveyorError } from 'electron-conveyor/main'
import type { RouterManifest } from 'electron-conveyor/renderer'
import { windowModule } from './modules/window'
import { webModule } from './modules/web'
import { settingsModule } from './modules/settings'
import { middleware, type AppContext } from './init'
import { publicFailure } from '../lib/main/bootstrap/operations'

export function registerRouter(
  context: Omit<AppContext, 'notifySettingsChanged'>,
  allowed: (event: IpcMainInvokeEvent) => boolean,
  eligible: (url: string) => boolean
) {
  const boundary = middleware(async ({ ctx, next }) => {
    if (!allowed(ctx.event)) throw new ConveyorError('UNAUTHORIZED', 'This window cannot access application data.')
    try {
      return await next()
    } catch (error) {
      const failure = publicFailure(error)
      if (failure.code === 'INTERNAL_ERROR') console.error('Application operation failed:', error)
      throw new ConveyorError(failure.code, failure.message, failure.field ? { field: failure.field } : undefined)
    }
  })
  const notifySettingsChanged = () => {
    for (const win of context.windows.all()) {
      if (win.isDestroyed() || !eligible(win.webContents.getURL())) continue
      try {
        createEmitter(settingsModule, win).changed({})
      } catch (error) {
        console.error('Settings notification failed:', error)
      }
    }
  }
  const router = createRouter(
    { window: windowModule, web: webModule, settings: settingsModule },
    { createContext: () => ({ ...context, notifySettingsChanged }), use: [boundary] }
  )
  // These handlers bypass Conveyor middleware. Streams/stores are not used by this starter.
  ipcMain.removeHandler('conveyor:stream:start')
  ipcMain.removeHandler('conveyor:stream:cancel')
  const manifest: RouterManifest = {}
  for (const [moduleId, module] of Object.entries(router.modules))
    manifest[moduleId] = Object.fromEntries(Object.entries(module.record).map(([name, def]) => [name, def.kind]))
  ipcMain.removeAllListeners('conveyor:manifest')
  ipcMain.on('conveyor:manifest', (event) => {
    event.returnValue = allowed(event as unknown as IpcMainInvokeEvent) ? manifest : {}
  })
  return router
}
export type AppRouter = ReturnType<typeof registerRouter>
