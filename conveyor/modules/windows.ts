import { z } from 'zod'
import { defineModule, query, command } from '../init'

/** Opens another app window, and reports how many are open, for the cross-window demos. */
export const windowsModule = defineModule({
  // Optional playground page id — the new window opens straight onto it.
  open: command(z.string().optional(), ({ input, ctx }) => {
    ctx.openWindow(input)
  }),
  count: query(({ ctx }) => ctx.windows.all().length),
  // This window's identity — the presence store keys ghost cursors by it.
  id: query(({ ctx }) => ctx.window?.id ?? -1),
})
