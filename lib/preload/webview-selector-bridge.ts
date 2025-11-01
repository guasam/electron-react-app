import { ipcRenderer } from 'electron'

const SELECTOR_MESSAGE_SOURCE = 'inspector-element-selector'

type ElementSelectorMessage =
  | { source: typeof SELECTOR_MESSAGE_SOURCE; type: 'INSPECTOR_ELEMENT_SELECTED'; payload: unknown }
  | { source: typeof SELECTOR_MESSAGE_SOURCE; type: 'INSPECTOR_ELEMENT_SELECTOR_CANCELLED' }
  | { source: typeof SELECTOR_MESSAGE_SOURCE; type: 'INSPECTOR_ELEMENT_SELECTOR_ERROR'; error: string }

window.addEventListener('message', (event: MessageEvent<ElementSelectorMessage | unknown>) => {
  if (event.source !== (window as any)) return
  const data = event.data as any
  if (!data || typeof data !== 'object') return
  if (data.source !== SELECTOR_MESSAGE_SOURCE) return
  try {
    // Forward to host renderer
    ipcRenderer.sendToHost('inspector-element-selector', data)
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('webview-selector-bridge failed to sendToHost', error)
  }
})


