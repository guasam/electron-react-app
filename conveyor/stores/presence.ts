import { z } from 'zod'
import { defineStore } from 'electron-conveyor/define'

/** One window's live pointer, in viewport-normalized coordinates (0..1). */
export interface Cursor {
  x: number
  y: number
  page: string
  hue: number
  at: number
}

/**
 * Ghost-cursor presence: every window publishes its pointer here and renders the others'.
 * Deliberately not persisted — cursors are ephemeral, and a `leave` is dispatched from main when a
 * window closes (see `setupEvents` in the router) so no ghost outlives its window.
 */
export const presenceStore = defineStore('presence', {
  state: { cursors: {} as Record<number, Cursor> },
  schemas: {
    move: z.object({
      id: z.number().int().nonnegative(),
      x: z.number().min(0).max(1),
      y: z.number().min(0).max(1),
      page: z.string().max(64),
    }),
    leave: z.number().int().nonnegative(),
  },
  actions: {
    move: (s, { id, x, y, page }) => {
      // Hue from the golden angle keeps any number of windows visually distinct.
      s.cursors[id] = { x, y, page, hue: Math.round((id * 137.5) % 360), at: Date.now() }
    },
    leave: (s, id) => {
      delete s.cursors[id]
    },
  },
})
