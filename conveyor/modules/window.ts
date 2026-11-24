import { BrowserWindow } from 'electron'
import { z } from 'zod'
import { defineModule, query, command, event } from '../init'
import { createEmitter } from 'electron-conveyor/main'

export const windowModule = defineModule({
  open: command(({ ctx }) => {
    ctx.openWindow()
  }),
  init: query(({ ctx }) => {
    const win = ctx.window
    if (!win) throw new Error('window.init called without an owning window')
    const { width, height } = win.getBounds()
    return {
      width,
      height,
      minimizable: win.isMinimizable(),
      maximizable: win.isMaximizable(),
      platform: process.platform,
    }
  }),

  isMinimizable: query(({ ctx }) => ctx.window?.isMinimizable() ?? false),
  isMaximizable: query(({ ctx }) => ctx.window?.isMaximizable() ?? false),

  minimize: command(({ ctx }) => {
    ctx.window?.minimize()
  }),

  maximize: command(({ ctx }) => {
    ctx.window?.maximize()
  }),

  close: command(({ ctx }) => {
    ctx.window?.close()
  }),

  maximizeToggle: command(({ ctx }) => {
    const win = ctx.window
    if (!win) return
    if (win.isMaximized()) win.unmaximize()
    else win.maximize()
  }),

  // main → renderer push
  onFocusChange: event(z.boolean()),
  onMaximizeChange: event(z.boolean()),
})

/** Wire this window's native events to the module's push emitters. */
export function setupWindowEvents(win: BrowserWindow): void {
  const emit = createEmitter(windowModule, win)
  win.on('focus', () => emit.onFocusChange(true))
  win.on('blur', () => emit.onFocusChange(false))
  win.on('maximize', () => emit.onMaximizeChange(true))
  win.on('unmaximize', () => emit.onMaximizeChange(false))
}
