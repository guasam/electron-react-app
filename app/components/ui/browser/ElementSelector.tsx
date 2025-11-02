import React from 'react'
import type { IpcMessageEvent } from 'electron'
import elementSelectorScript from '@/lib/webview-injections/element-selector.js?raw'

export interface ElementIdentity {
  tagName: string
  id?: string
  className?: string
  textContent?: string
  attributes: Record<string, string>
}

const SELECTOR_MESSAGE_SOURCE = 'inspector-element-selector' as const

type SelectorBridgeMessage =
  | { source: typeof SELECTOR_MESSAGE_SOURCE; type: 'INSPECTOR_ELEMENT_SELECTED'; payload: ElementIdentity }
  | { source: typeof SELECTOR_MESSAGE_SOURCE; type: 'INSPECTOR_ELEMENT_SELECTOR_CANCELLED' }
  | { source: typeof SELECTOR_MESSAGE_SOURCE; type: 'INSPECTOR_ELEMENT_SELECTOR_ERROR'; error: string }

interface ElementSelectorProps {
  webviewRef: React.RefObject<Electron.WebviewTag | null>
  enabled: boolean
  onSelected: (element: ElementIdentity) => void
  onRequestDisable: () => void
}

export function ElementSelector({ webviewRef, enabled, onSelected, onRequestDisable }: ElementSelectorProps) {
  const injectedRef = React.useRef<boolean>(false)
  const pollingRef = React.useRef<number | null>(null)

  const injectSelector = React.useCallback(async () => {
    if (!webviewRef.current || injectedRef.current) return

    injectedRef.current = true

    // Replace the placeholder with the actual message source constant
    const scriptToInject = elementSelectorScript.replace(
      '__MESSAGE_SOURCE_PLACEHOLDER__',
      SELECTOR_MESSAGE_SOURCE
    )

    await webviewRef.current.executeJavaScript(scriptToInject).catch((error) => {
      console.error('Failed to inject selector', error)
      injectedRef.current = false
    })
  }, [webviewRef])

  const clearSelector = React.useCallback(async () => {
    if (!webviewRef.current) return

    injectedRef.current = false

    try {
      await webviewRef.current.executeJavaScript(`
        (function() {
          const overlay = document.getElementById('__inspector_selector_overlay');
          const info = document.getElementById('__inspector_selector_info');
          if (overlay) overlay.remove();
          if (info) info.remove();
          window.__inspectorSelectorActive = false;
        })();
      `)
    } catch (error) {
      console.error('Failed to clear selector overlay', error)
    }
  }, [webviewRef])

  React.useEffect(() => {
    const view = webviewRef.current

    if (!enabled || !view) {
      if (injectedRef.current) {
        clearSelector().catch(() => {})
        injectedRef.current = false
      }
      if (pollingRef.current) {
        window.clearInterval(pollingRef.current)
        pollingRef.current = null
      }
      return
    }

    if (!injectedRef.current) {
      injectSelector().catch(error => {
        console.error('Failed to inject element selector', error)
        injectedRef.current = false
        onRequestDisable()
      })
    }

    const handleMessage = (event: IpcMessageEvent) => {
      if (event.channel !== 'inspector-element-selector') return
      const [raw] = Array.isArray(event.args) ? event.args : []
      if (!raw || typeof raw !== 'object') return

      const message = raw as SelectorBridgeMessage
      if (message.source !== SELECTOR_MESSAGE_SOURCE) return

      if (message.type === 'INSPECTOR_ELEMENT_SELECTED') {
        injectedRef.current = false
        clearSelector().catch(() => {})
        onSelected(message.payload)
      } else if (message.type === 'INSPECTOR_ELEMENT_SELECTOR_CANCELLED') {
        injectedRef.current = false
        clearSelector().catch(() => {})
        onRequestDisable()
      } else if (message.type === 'INSPECTOR_ELEMENT_SELECTOR_ERROR') {
        injectedRef.current = false
        console.error('Element selector error from webview:', message.error)
        clearSelector().catch(() => {})
        onRequestDisable()
      }
    }

    view.addEventListener('ipc-message', handleMessage)

    // Fallback: short-lived polling only while selector is active
    if (!pollingRef.current) {
      pollingRef.current = window.setInterval(async () => {
        if (!webviewRef.current) return
        try {
          const result = await webviewRef.current.executeJavaScript('window.__inspectorSelectorResult || null')
          if (result) {
            await webviewRef.current.executeJavaScript('window.__inspectorSelectorResult = null')
            injectedRef.current = false
            clearSelector().catch(() => {})
            onSelected(result)
          }
        } catch {
          // ignore
        }
      }, 120)
    }

    return () => {
      view.removeEventListener('ipc-message', handleMessage)
      if (injectedRef.current) {
        clearSelector().catch(() => {})
        injectedRef.current = false
      }
      if (pollingRef.current) {
        window.clearInterval(pollingRef.current)
        pollingRef.current = null
      }
    }
  }, [enabled, injectSelector, clearSelector, onSelected, onRequestDisable, webviewRef])

  

  if (!enabled) return null

  return null
}

