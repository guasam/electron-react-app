import { app } from 'electron'
import os from 'node:os'
import { defineModule, query } from '../init'

/** How often CPU usage is sampled, in ms. */
const SAMPLE_INTERVAL_MS = 1000

/** How many samples of CPU history are kept for the monitor's graph. */
const HISTORY_LENGTH = 60

/** Idle and total CPU time summed over every core, in ms since boot. */
function readCpuTimes() {
  let idle = 0
  let total = 0
  for (const { times } of os.cpus()) {
    idle += times.idle
    total += times.user + times.nice + times.sys + times.idle + times.irq
  }
  return { idle, total }
}

// Sampled on a timer of its own, so the numbers don't depend on how many windows poll or how often.
const cpuHistory: number[] = []
let lastCpuTimes = readCpuTimes()

setInterval(() => {
  const next = readCpuTimes()
  const total = next.total - lastCpuTimes.total
  const idle = next.idle - lastCpuTimes.idle
  lastCpuTimes = next

  cpuHistory.push(total > 0 ? Math.round((1 - idle / total) * 100) : 0)
  if (cpuHistory.length > HISTORY_LENGTH) cpuHistory.shift()
}, SAMPLE_INTERVAL_MS).unref()

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
      /** CPU usage per sample, 0-100, oldest first. Empty until the first sample lands. */
      cpuHistory: [...cpuHistory],
      loadAvg: os.loadavg(),
      uptime: os.uptime(),
    }
  }),
})
