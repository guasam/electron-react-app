import type { BrowserWindow, dialog } from 'electron'
import type { ArchiveChooser } from '../../../modules/settings/infrastructure/file-settings-archive-repository'

// Native dialogs can outlive their owner. Release the operation on cancellation,
// and still consume a late native rejection after its window has gone away.
export function cancellableChoice<T>(signal: AbortSignal, choose: () => Promise<T>): Promise<T | null> {
  if (signal.aborted) return Promise.resolve(null)
  return new Promise((resolve, reject) => {
    const abort = () => resolve(null)
    signal.addEventListener('abort', abort, { once: true })
    Promise.resolve()
      .then(() => (signal.aborted ? null : choose()))
      .then(resolve, reject)
      .finally(() => signal.removeEventListener('abort', abort))
  })
}

export function createArchiveChooser(
  window: BrowserWindow,
  signal: AbortSignal,
  dialogs: Pick<typeof dialog, 'showOpenDialog' | 'showSaveDialog'>
): ArchiveChooser {
  return {
    async open() {
      const result = await cancellableChoice(signal, () =>
        dialogs.showOpenDialog(window, {
          properties: ['openFile'],
          filters: [{ name: 'Settings archive', extensions: ['json'] }],
        })
      )
      return result && !result.canceled ? (result.filePaths[0] ?? null) : null
    },
    async save() {
      const result = await cancellableChoice(signal, () =>
        dialogs.showSaveDialog(window, {
          defaultPath: 'settings.json',
          filters: [{ name: 'Settings archive', extensions: ['json'] }],
        })
      )
      return result && !result.canceled ? (result.filePath ?? null) : null
    },
  }
}
