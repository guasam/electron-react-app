import type { BrowserWindow } from 'electron'
import { createRouter, devLogger } from 'electron-conveyor/main'
import { windows, openAppWindow } from '@/lib/main/app'
import { windowModule, setupWindowEvents } from './modules/window'
import { webModule } from './modules/web'
import { filesModule } from './modules/files'
import { systemModule } from './modules/system'
import { streamModule } from './modules/stream'
import { secureModule } from './modules/secure'
import { windowsModule } from './modules/windows'
import { notifyModule } from './modules/notify'
import { tasksModule } from './modules/tasks'
import { sharedStore } from './stores/shared'
import { presenceStore } from './stores/presence'

/**
 * The app's whole IPC surface — modules, stores, context, global middleware — registered in one
 * place. Runtime is MAIN-ONLY; the renderer imports only `type AppRouter`. `window` and `web` are
 * the core modules (the titlebar needs them); the rest power the playground pages.
 */

/** Main-process start time — surfaced to handlers as `ctx.appStartedAt`. */
const APP_STARTED_AT = Date.now()

export const router = createRouter(
  {
    window: windowModule,
    web: webModule,
    files: filesModule,
    system: systemModule,
    stream: streamModule,
    secure: secureModule,
    windows: windowsModule,
    notify: notifyModule,
    tasks: tasksModule,
  },
  {
    createContext: () => ({ appStartedAt: APP_STARTED_AT, windows, openWindow: openAppWindow }),
    use: [devLogger], // per-call timing in dev, a no-op in packaged builds
    stores: [sharedStore, presenceStore],
  }
)

export type AppRouter = typeof router

/** Wire per-window push events. Call once per created window. */
export function setupEvents(win: BrowserWindow): void {
  setupWindowEvents(win)
  // Trusted main-side dispatch: a closed window must not leave its ghost cursor behind.
  const id = win.id
  win.on('closed', () => router.stores.presence.dispatch('leave', id))
}
