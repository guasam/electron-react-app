import { dialog } from 'electron'
import type { Dirent } from 'node:fs'
import { readdir, stat } from 'node:fs/promises'
import { join, relative } from 'node:path'
import { z } from 'zod'
import { defineModule, command, stream } from '../init'

/** One top-level entry of the scanned folder, with its fully aggregated size. */
export interface ScanEntry {
  name: string
  bytes: number
  files: number
  dir: boolean
}

const PROGRESS_INTERVAL_MS = 50

/**
 * Folder analyzer - `pick` opens the native folder dialog, `scan` walks the chosen folder in main
 * (recursive readdir + stat, real filesystem work the renderer cannot do) and streams live progress
 * until it yields the final per-entry size breakdown. Only names and sizes ever cross the IPC
 * boundary, never file contents. Symlinks are skipped so a cycle cannot trap the walk.
 */
export const analyzerModule = defineModule({
  pick: command(async ({ ctx }) => {
    const options = { properties: ['openDirectory' as const] }
    const result = ctx.window ? await dialog.showOpenDialog(ctx.window, options) : await dialog.showOpenDialog(options)
    return result.canceled ? null : (result.filePaths[0] ?? null)
  }),

  scan: stream(z.string(), async function* ({ input: root, signal }) {
    const safeSize = async (path: string) => {
      try {
        return (await stat(path)).size
      } catch {
        return 0 // unreadable file: count it as weightless rather than aborting the scan
      }
    }

    let dirents: Dirent[]
    try {
      dirents = await readdir(root, { withFileTypes: true })
    } catch {
      yield { kind: 'done' as const, root, totalFiles: 0, totalBytes: 0, entries: [] as ScanEntry[] }
      return
    }

    const entries: ScanEntry[] = []
    let totalFiles = 0
    let totalBytes = 0
    let lastProgress = 0

    for (const dirent of dirents) {
      if (signal.aborted) return
      if (dirent.isSymbolicLink()) continue
      const full = join(root, dirent.name)

      if (dirent.isFile()) {
        const bytes = await safeSize(full)
        entries.push({ name: dirent.name, bytes, files: 1, dir: false })
        totalBytes += bytes
        totalFiles += 1
        continue
      }
      if (!dirent.isDirectory()) continue

      // Aggregate the subtree with an explicit stack (recursion-free, so depth can't blow it up),
      // yielding progress on a timer instead of per file to keep the channel calm on huge trees.
      let bytes = 0
      let files = 0
      const stack = [full]
      while (stack.length) {
        if (signal.aborted) return
        const dir = stack.pop()!
        let items: Dirent[]
        try {
          items = await readdir(dir, { withFileTypes: true })
        } catch {
          continue // unreadable directory: skip its subtree
        }
        for (const item of items) {
          if (item.isSymbolicLink()) continue
          const path = join(dir, item.name)
          if (item.isDirectory()) stack.push(path)
          else if (item.isFile()) {
            bytes += await safeSize(path)
            files += 1
          }
        }
        const now = Date.now()
        if (now - lastProgress > PROGRESS_INTERVAL_MS) {
          lastProgress = now
          yield {
            kind: 'progress' as const,
            files: totalFiles + files,
            bytes: totalBytes + bytes,
            current: relative(root, dir) || '.',
          }
        }
      }
      entries.push({ name: dirent.name, bytes, files, dir: true })
      totalBytes += bytes
      totalFiles += files
    }

    entries.sort((a, b) => b.bytes - a.bytes)
    yield { kind: 'done' as const, root, totalFiles, totalBytes, entries }
  }),
})
