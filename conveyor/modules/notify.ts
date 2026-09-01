import { z } from 'zod'
import { defineModule, command, event } from '../init'
import { createEmitter } from 'electron-conveyor/main'

/**
 * Cross-window notify - a typed main→renderer event fanned out to the OTHER windows (not the caller,
 * which already sees the change) via the window manager on ctx. Used by the shared-store demo.
 */
export const notifyModule = defineModule({
  onNotify: event(z.string()),

  toOthers: command(z.string(), ({ input, ctx }) => {
    createEmitter(notifyModule, ctx.windows.except(ctx.sender)).onNotify(input)
  }),
})
