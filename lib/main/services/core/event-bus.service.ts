import { EventEmitter } from 'eventemitter3'
import { BrowserWindow } from 'electron'
import type { ProgressEvent } from '@/lib/main/types/workflow.types'

export class EventBusService {
  private emitter = new EventEmitter()
  private mainWindow: BrowserWindow | null = null

  setMainWindow(window: BrowserWindow) {
    this.mainWindow = window
  }

  // Emit event to both internal listeners and renderer
  emit(event: string, data: any) {
    this.emitter.emit(event, data)

    // Forward to renderer if window exists
    if (this.mainWindow && !this.mainWindow.isDestroyed()) {
      this.mainWindow.webContents.send('workflow:event', { event, data })
    }
  }

  on(event: string, handler: (...args: any[]) => void) {
    this.emitter.on(event, handler)
  }

  off(event: string, handler: (...args: any[]) => void) {
    this.emitter.off(event, handler)
  }

  // Progress tracking helpers
  emitProgress(progress: ProgressEvent) {
    this.emit('workflow:progress', progress)
  }

  emitStepStart(runId: string, step: number, totalSteps: number, stepName: string) {
    this.emitProgress({
      runId,
      step,
      totalSteps,
      status: 'running',
      message: `Starting: ${stepName}`,
    })
  }

  emitStepComplete(runId: string, step: number, totalSteps: number, stepName: string) {
    this.emitProgress({
      runId,
      step,
      totalSteps,
      status: 'completed',
      message: `Completed: ${stepName}`,
    })
  }

  emitStepError(runId: string, step: number, totalSteps: number, error: string) {
    this.emitProgress({
      runId,
      step,
      totalSteps,
      status: 'failed',
      message: error,
    })
  }
}
