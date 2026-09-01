import { z } from 'zod'
import { defineStore } from 'electron-conveyor/define'

/**
 * A cross-window store: a shared notes list that stays in sync across every open window, and
 * persists across restarts (`persist` writes it as JSON under the app's userData dir).
 *
 * Actions with a payload declare its schema — main validates every renderer-invoked payload
 * against it, and the action's payload parameter is typed *from* the schema (schema-first).
 */
export const sharedStore = defineStore('shared', {
  state: { count: 0, notes: [] as string[] },
  schemas: {
    increment: z.number().optional(),
    decrement: z.number().optional(),
    add: z.string(),
    remove: z.number().int().nonnegative(),
  },
  actions: {
    increment: (s, by = 1) => {
      s.count += by
    },
    decrement: (s, by = 1) => {
      s.count -= by
    },
    add: (s, note) => {
      const trimmed = note.trim()
      if (trimmed) s.notes.push(trimmed)
    },
    remove: (s, index) => {
      s.notes.splice(index, 1)
    },
    clear: (s) => {
      s.notes = []
    },
  },
  persist: true,
})
