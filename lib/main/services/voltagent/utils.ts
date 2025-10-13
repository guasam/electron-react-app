import { app } from 'electron'
import path from 'path'

export function getMemoryPath(): string {
  return path.join(app.getPath('userData'), '.voltagent')
}
