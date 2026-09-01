import { dialog } from 'electron'
import { readFile, stat } from 'node:fs/promises'
import { basename } from 'node:path'
import { defineModule, command } from '../init'

const MAX_PREVIEW = 100_000
const TEXT_EXTS = [
  'txt',
  'md',
  'json',
  'ts',
  'tsx',
  'js',
  'jsx',
  'css',
  'html',
  'yml',
  'yaml',
  'log',
  'csv',
  'xml',
  'sh',
]

/** Native file access - opens the OS file picker and reads the chosen file as text. */
export const filesModule = defineModule({
  open: command(async ({ ctx }) => {
    const options = {
      properties: ['openFile' as const],
      filters: [
        { name: 'Text files', extensions: TEXT_EXTS },
        { name: 'All files', extensions: ['*'] },
      ],
    }
    const result = ctx.window ? await dialog.showOpenDialog(ctx.window, options) : await dialog.showOpenDialog(options)
    const path = result.filePaths[0]
    if (result.canceled || !path) return null

    const info = await stat(path)
    const buf = await readFile(path)
    // A NUL byte in the head is a reliable "this is not text" signal.
    const binary = buf.subarray(0, 8000).includes(0)
    return {
      name: basename(path),
      path,
      size: info.size,
      content: binary ? '' : buf.subarray(0, MAX_PREVIEW).toString('utf-8'),
      truncated: !binary && info.size > MAX_PREVIEW,
      binary,
    }
  }),
})
