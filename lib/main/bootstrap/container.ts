import { createContainer, asValue, InjectionMode } from 'awilix'
import { dialog, type BrowserWindow } from 'electron'
import { randomUUID } from 'node:crypto'
import type { DatabaseResource } from '../infrastructure/database/database'
import { registerSettings, type SettingsDependencies } from '../../../modules/settings/providers'
import { OperationRunner } from './operations'
import { createArchiveChooser } from '../infrastructure/native-archive-chooser'

type Services = Pick<SettingsDependencies, 'settings' | 'archives'>
type Context = { window: BrowserWindow; signal: AbortSignal }
export function createBusinessHost(resource: DatabaseResource, protectedDirectory: string) {
  const root = createContainer<SettingsDependencies>({ injectionMode: InjectionMode.PROXY, strict: true })
  root.register({
    database: asValue(resource.db),
    protectedDirectory: asValue(protectedDirectory),
    clock: asValue({ now: () => new Date().toISOString() }),
    ids: asValue({ next: randomUUID }),
  })
  registerSettings(root)
  const controllers = new Set<AbortController>()
  const runner = new OperationRunner<Services, Context>(async ({ window, signal }) => {
    const scope = root.createScope()
    scope.register({ archiveSignal: asValue(signal), chooser: asValue(createArchiveChooser(window, signal, dialog)) })
    try {
      return {
        services: { settings: scope.resolve('settings'), archives: scope.resolve('archives') },
        dispose: () => scope.dispose(),
      }
    } catch (error) {
      await scope.dispose()
      throw error
    }
  })
  return {
    async run<T>(window: BrowserWindow, work: (services: Services) => Promise<T>, changed?: (result: T) => void) {
      const controller = new AbortController(),
        abort = () => controller.abort()
      controllers.add(controller)
      window.once('closed', abort)
      try {
        return await runner.run({ window, signal: controller.signal }, work, changed)
      } finally {
        window.removeListener('closed', abort)
        controllers.delete(controller)
      }
    },
    async shutdown() {
      controllers.forEach((controller) => controller.abort())
      await runner.shutdown()
      try {
        await root.dispose()
      } finally {
        resource.close()
      }
    },
  }
}
export type BusinessHost = ReturnType<typeof createBusinessHost>
