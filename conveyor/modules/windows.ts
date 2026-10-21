import { z } from 'zod'
import { defineModule, query, command } from '../init'

/** The demos need one pair of windows; any more would only pile up. */
const MAX_WINDOWS = 2

/** Opens another app window, and reports how many are open, for the cross-window demos. */
export const windowsModule = defineModule({
  // Optional playground page id — the new window opens straight onto it. Ignored once the pair exists.
  open: command(z.string().optional(), ({ input, ctx }) => {
    if (ctx.windows.all().length >= MAX_WINDOWS) return
    ctx.openWindow(input, ctx.window)
  }),
  count: query(({ ctx }) => ctx.windows.all().length),
  // This window's identity — the presence store keys ghost cursors by it.
  id: query(({ ctx }) => ctx.window?.id ?? -1),
})
