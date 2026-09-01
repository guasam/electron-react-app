import { initConveyor } from 'electron-conveyor/define'
import type { ConveyorWindowManager } from 'electron-conveyor/main'

/**
 * The app's custom handler context, merged onto the base electron fields (`event`, `sender`,
 * `window`) for every handler. Supplied by `createContext` in `router.ts`. It's a type, so
 * referencing main-only services here never pulls runtime into the renderer bundle.
 */
export interface AppContext {
  /** Epoch ms when the main process started. */
  appStartedAt: number
  /** The label→window registry — fan-out targets (`windows.broadcast`, `.except(sender)`, ...). */
  windows: ConveyorWindowManager
  /** Open another app window, optionally deep-linked onto a page (via the URL hash). */
  openWindow: (page?: string) => void
}

/** Authoring primitives bound to `AppContext`. Modules import these instead of the bare package. */
export const { query, command, stream, event, middleware, defineModule } = initConveyor<AppContext>()
