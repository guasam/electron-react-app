import { z } from 'zod'
import { ConveyorError } from 'electron-conveyor/define'
import { defineModule, query, command, middleware } from '../init'

// Demo-only lock state, held in main. A real app would gate on a session/token in context.
let unlocked = false
const PIN = '1234'

/**
 * Guard — blocks the handler unless the demo is unlocked. Thrown as a ConveyorError with a custom
 * code, so the renderer can branch on `err.code === 'LOCKED'` instead of matching message strings.
 */
const requireUnlocked = middleware(({ next }) => {
  if (!unlocked) throw new ConveyorError('LOCKED', 'Locked: unlock with PIN 1234 first')
  return next()
})

/** A reusable guarded base — everything defined through it runs behind the unlock check. */
const guarded = query.use(requireUnlocked)

/**
 * Middleware + context demo — `readSecret` is built on the `guarded` base and reads
 * `ctx.appStartedAt` from the app context. Try it locked (fails with code LOCKED), unlock, try again.
 */
export const secureModule = defineModule({
  status: query(() => ({ unlocked })),

  unlock: command(z.string(), ({ input }) => {
    unlocked = input === PIN
    return unlocked
  }),

  lock: command(() => {
    unlocked = false
  }),

  readSecret: guarded(({ ctx }) => ({ secret: 'The cake is a lie 🍰', uptimeMs: Date.now() - ctx.appStartedAt })),
})
