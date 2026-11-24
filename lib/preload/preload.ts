import { contextBridge, ipcRenderer } from 'electron'
import type { ConveyorBridge, RouterManifest } from 'electron-conveyor/renderer'

const manifest = ipcRenderer.sendSync('conveyor:manifest') as RouterManifest
const procedures = new Set<string>(),
  subscriptions = new Set<string>()
for (const [module, members] of Object.entries(manifest)) {
  for (const [name, kind] of Object.entries(members)) {
    if (kind === 'query' || kind === 'command') procedures.add(`conveyor:${module}/${name}`)
    if (kind === 'event') subscriptions.add(`conveyor:event:${module}:${name}`)
  }
}
const bridge: ConveyorBridge = {
  invoke: (channel, method, ...args) => {
    if (!procedures.has(`${channel}/${method}`)) return Promise.reject(new Error('Unregistered application procedure.'))
    return ipcRenderer.invoke(channel, method, ...args)
  },
  subscribe: (channel, callback) => {
    if (!subscriptions.has(channel)) throw new Error('Unregistered application event.')
    const listener = (_event: Electron.IpcRendererEvent, payload: unknown) => callback(payload)
    ipcRenderer.on(channel, listener)
    return () => ipcRenderer.removeListener(channel, listener)
  },
  manifest: () => manifest,
}
contextBridge.exposeInMainWorld('conveyor', bridge)
