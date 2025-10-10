import { handle } from '@/lib/main/shared'
import { updateManager } from '@/lib/main/updater'

export const registerUpdaterHandlers = () => {
  handle('updater-check', () => {
    updateManager.requestUpdateCheck()
  })

  handle('updater-get-status', () => {
    // This is a placeholder - in a real implementation, you'd track the current status
    return {
      status: 'idle',
      message: 'Auto-update is running in the background',
    }
  })
}