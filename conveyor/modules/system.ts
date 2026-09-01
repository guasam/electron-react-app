import { app } from 'electron'
import os from 'node:os'
import { defineModule, query } from '../init'

/** System integration - a typed query reading real main-process info for a live monitor. */
export const systemModule = defineModule({
  info: query(() => {
    const cpus = os.cpus()
    return {
      version: app.getVersion(),
      platform: process.platform,
      arch: process.arch,
      release: os.release(),
      cpuModel: cpus[0]?.model ?? 'unknown',
      cpuCount: cpus.length,
      totalMem: os.totalmem(),
      freeMem: os.freemem(),
      loadAvg: os.loadavg(),
      uptime: os.uptime(),
    }
  }),
})
