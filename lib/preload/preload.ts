import { contextBridge, ipcRenderer } from 'electron'
import { join } from 'path'
import { conveyor } from '@/lib/conveyor/api'

const SELECTOR_MESSAGE_SOURCE = 'inspector-element-selector'
const WEBVIEW_PRELOAD_PATH = join(__dirname, 'webview-selector-bridge.js')

type ElementSelectorMessage =
  | { source: typeof SELECTOR_MESSAGE_SOURCE; type: 'INSPECTOR_ELEMENT_SELECTED'; payload: unknown }
  | { source: typeof SELECTOR_MESSAGE_SOURCE; type: 'INSPECTOR_ELEMENT_SELECTOR_CANCELLED' }
  | { source: typeof SELECTOR_MESSAGE_SOURCE; type: 'INSPECTOR_ELEMENT_SELECTOR_ERROR'; error: string }

// Use `contextBridge` APIs to expose APIs to
// renderer only if context isolation is enabled, otherwise
// just add to the DOM global.
if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('conveyor', conveyor)
    contextBridge.exposeInMainWorld('inspectorBridge', {
      webviewPreload: WEBVIEW_PRELOAD_PATH,
    })
  } catch (error) {
    console.error(error)
  }
} else {
  window.conveyor = conveyor
  ;(window as typeof window & { inspectorBridge?: { webviewPreload: string } }).inspectorBridge = {
    webviewPreload: WEBVIEW_PRELOAD_PATH,
  }
}

window.addEventListener('message', (event: MessageEvent<ElementSelectorMessage | unknown>) => {
  if (event.source !== window) return

  const data = event.data
  if (!data || typeof data !== 'object') return

  const message = data as ElementSelectorMessage
  if (message.source !== SELECTOR_MESSAGE_SOURCE) return

  const sendToHost = (ipcRenderer as unknown as { sendToHost?: (channel: string, ...args: any[]) => void }).sendToHost
  if (typeof sendToHost !== 'function') return

  try {
    sendToHost.call(ipcRenderer, 'inspector-element-selector', message)
  } catch (error) {
    console.error('Failed to forward element selector message', error)
  }
})
