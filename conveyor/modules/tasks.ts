import { app } from 'electron'
import { readdir, stat } from 'node:fs/promises'
import { join, relative } from 'node:path'
import { z } from 'zod'
import { defineModule, command, event } from '../init'
import { createEmitter } from 'electron-conveyor/main'

const SKIP = new Set(['node_modules', '.git', 'dist', 'out', '.vite', 'release', 'coverage'])
const MAX_FILES = 200
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

/**
 * Background task demo - a fire-and-forget `run` does REAL work in main (walks the app directory and
 * stats every file, something the renderer cannot do) and reports genuine progress (the current file,
 * running count and byte total) to the calling window via the `onProgress` push event.
 */
export const tasksModule = defineModule({
  onProgress: event(
    z.object({
      percent: z.number(),
      current: z.string(),
      files: z.number(),
      bytes: z.number(),
      done: z.boolean(),
    })
  ),

  run: command(async ({ ctx }) => {
    const win = ctx.window
    if (!win) return
    const emit = createEmitter(tasksModule, win)
    const root = app.getAppPath()

    // Collect real files under the app directory (bounded).
    const files: string[] = []
    const walk = async (dir: string, depth: number): Promise<void> => {
      if (depth > 4 || files.length >= MAX_FILES) return
      let entries
      try {
        entries = await readdir(dir, { withFileTypes: true })
      } catch {
        return
      }
      for (const entry of entries) {
        if (files.length >= MAX_FILES) break
        if (entry.name.startsWith('.') || SKIP.has(entry.name)) continue
        const full = join(dir, entry.name)
        if (entry.isDirectory()) await walk(full, depth + 1)
        else files.push(full)
      }
    }
    await walk(root, 0)

    if (files.length === 0) {
      emit.onProgress({ percent: 100, current: '(nothing to scan)', files: 0, bytes: 0, done: true })
      return
    }

    // Stat each file, reporting genuine progress as we go.
    let bytes = 0
    for (let i = 0; i < files.length; i++) {
      try {
        bytes += (await stat(files[i])).size
      } catch {
        // unreadable file, skip its size
      }
      emit.onProgress({
        percent: Math.round(((i + 1) / files.length) * 100),
        current: relative(root, files[i]),
        files: i + 1,
        bytes,
        done: i === files.length - 1,
      })
      await sleep(14) // keep the work visible
    }
  }),
})
