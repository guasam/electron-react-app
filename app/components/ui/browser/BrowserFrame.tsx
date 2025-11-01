import React from 'react'
import BrowserTopBar from './BrowserTopBar'
import { useTabs } from '@/app/components/window/TabsContext'
import WorkspaceLoadingSteps from '@/app/components/ui/browser/skeletons/WorkspaceLoadingSteps'
import { AnimatePresence, motion } from 'framer-motion'
import { ElementSelector, ElementIdentity } from './ElementSelector'
import { useConveyor } from '@/app/hooks/use-conveyor'

interface BrowserViewProps {
  initialUrl?: string
  heightClassName?: string
  partitionId: string
  tabId: string
  workspacePath?: string
  showElementSelector?: boolean
  onElementSelectorDismiss?: () => void
  onElementSelectorRequest?: () => void
  onElementContext?: (context: ElementSelectionContext) => void
}

export interface ElementSelectionContext {
  element: ElementIdentity
  codeSnippet?: {
    code: string
    relativePath: string
    startLine: number
    endLine: number
  }
}

export default function BrowserFrame({
  initialUrl = 'http://localhost:3000',
  heightClassName = 'h-full',
  partitionId,
  tabId,
  workspacePath,
  showElementSelector = false,
  onElementSelectorDismiss,
  onElementSelectorRequest,
  onElementContext,
}: BrowserViewProps) {
  const [url, setUrl] = React.useState<string>(initialUrl)
  const webviewRef = React.useRef<Electron.WebviewTag | null>(null)
  const { updateTab, tabs, openingTabId, endOpeningTab } = useTabs()
  const currentTab = tabs.find(t => t.id === tabId)
  const [progress, setProgress] = React.useState<number>(0)
  const loadingTickerRef = React.useRef<number | null>(null)
  const pendingStopTimerRef = React.useRef<number | null>(null)
  const showDelayTimerRef = React.useRef<number | null>(null)
  const [showLoadingUI, setShowLoadingUI] = React.useState<boolean>(false)
  const activeLoadIdRef = React.useRef<number>(0)
  const sessionActiveRef = React.useRef<boolean>(false)
  const [steps, setSteps] = React.useState({ setup: false, branch: false, start: false, connect: false })
  const inspectorApi = useConveyor('inspector')
  const webviewPreload = (window as typeof window & { inspectorBridge?: { webviewPreload?: string } }).inspectorBridge?.webviewPreload

  const handleElementSelected = React.useCallback(async (element: ElementIdentity) => {
    onElementSelectorDismiss?.()

    if (!workspacePath) {
      console.warn('Cannot map element to code without workspace path')
      onElementContext?.({ element })
      return
    }

    try {
      const searchResult = await inspectorApi.inspectorSearchElement(
        {
          tagName: element.tagName,
          id: element.id,
          className: element.className,
          textContent: element.textContent,
          componentName: element.attributes['data-component'] || element.id || element.className?.split(/\s+/)[0],
        },
        workspacePath
      ) as {
        matches: Array<{
          relativePath: string
          lineNumber: number
          preview: string
          score: number
        }>
      }

      if (!searchResult.matches.length) {
        onElementContext?.({ element })
        return
      }

      const bestMatch = searchResult.matches[0]
      const code = await inspectorApi.inspectorGetElementCode(
        workspacePath,
        bestMatch.relativePath,
        bestMatch.lineNumber
      ) as {
        code: string
        startLine: number
        endLine: number
        absolutePath: string
      }

      onElementContext?.({
        element,
        codeSnippet: {
          code: code.code,
          relativePath: bestMatch.relativePath,
          startLine: code.startLine,
          endLine: code.endLine,
        },
      })
    } catch (error) {
      console.error('Failed to map element to code', error)
      onElementContext?.({ element })
    }
  }, [inspectorApi, workspacePath, onElementSelectorDismiss, onElementContext])

  const handleBack = () => {
    const view = webviewRef.current
    if (view?.canGoBack()) view.goBack()
  }

  const handleForward = () => {
    const view = webviewRef.current
    if (view?.canGoForward()) view.goForward()
  }

  const handleReload = () => {
    const view = webviewRef.current
    view?.reload()
  }

  const handleStop = () => {
    const view = webviewRef.current
    view?.stop()
  }

  const handleSubmit = (value: string) => {
    const next = value.match(/^[a-zA-Z][a-zA-Z0-9+.-]*:\/\//) ? value : `http://${value}`
    setUrl(next)
    const view = webviewRef.current
    if (view) view.setAttribute('src', next)
    updateTab(tabId, { url: next })
  }

  // Handle tab URL updates
  React.useEffect(() => {
    if (currentTab?.url && currentTab.url !== url && currentTab.url !== '') {
      setUrl(currentTab.url)
      const view = webviewRef.current
      if (view) {
        view.setAttribute('src', currentTab.url)
      }
    }
  }, [currentTab?.url, url])

  // Subscribe to real-time workspace progress events for this tab
  React.useEffect(() => {
    const api = (window as any).conveyor?.workspace
    if (!api || !api.onProgress) return
    const unsubscribe = api.onProgress((payload: any) => {
      if (payload?.clientRequestId !== tabId) return
      const step: string | undefined = payload?.step
      if (step === 'creating_worktree') setSteps((s) => ({ ...s, setup: true }))
      if (step === 'worktree_created') setSteps((s) => ({ ...s, branch: true }))
      if (step === 'starting_dev') setSteps((s) => ({ ...s, start: true }))
      if (step === 'dev_ready') setSteps((s) => ({ ...s, connect: true }))
    })
    return () => { if (typeof unsubscribe === 'function') unsubscribe() }
  }, [tabId])

  React.useEffect(() => {
    const view = webviewRef.current
    if (!view) return
    const syncUrl = () => {
      const current = view.getURL()
      setUrl(current)
      updateTab(tabId, { url: current })
    }
    const syncTitle = () => {
      updateTab(tabId, { title: view.getTitle() })
    }
    const startTicker = (loadId: number) => {
      if (loadingTickerRef.current !== null) window.clearInterval(loadingTickerRef.current)
      loadingTickerRef.current = window.setInterval(() => {
        // Guard against stale intervals from previous sessions
        if (activeLoadIdRef.current !== loadId) return
        setProgress((prev) => {
          const target = 0.85
          const next = prev + (target - prev) * 0.06
          return Math.min(next, target - 0.001)
        })
      }, 100)
    }
    const stopTicker = () => {
      if (loadingTickerRef.current !== null) {
        window.clearInterval(loadingTickerRef.current)
        loadingTickerRef.current = null
      }
    }
    const handleStartLoading = () => {
      // If a stop was pending (redirect), cancel it and continue the same session
      if (pendingStopTimerRef.current !== null) {
        window.clearTimeout(pendingStopTimerRef.current)
        pendingStopTimerRef.current = null
      }
      if (!sessionActiveRef.current) {
        // New top-level session
        sessionActiveRef.current = true
        activeLoadIdRef.current += 1
        const loadId = activeLoadIdRef.current
        setProgress(0.15)
        // Show delay to avoid flashing on ultra-fast loads
        if (showDelayTimerRef.current) window.clearTimeout(showDelayTimerRef.current)
        setShowLoadingUI(false)
        showDelayTimerRef.current = window.setTimeout(() => {
          if (activeLoadIdRef.current === loadId) {
            setShowLoadingUI(true)
            // Handoff overlay control from "opening tab" to webview loading without a gap
            if (openingTabId === tabId) endOpeningTab()
          }
        }, 150)
        startTicker(loadId)
      } else {
        // Already in a session (redirect) — keep progress, ensure ticker running
        if (loadingTickerRef.current === null) startTicker(activeLoadIdRef.current)
      }
    }
    const handleStopLoading = () => {
      // Debounce stop so a redirect that immediately restarts doesn't end the session
      if (pendingStopTimerRef.current !== null) {
        window.clearTimeout(pendingStopTimerRef.current)
      }
      pendingStopTimerRef.current = window.setTimeout(() => {
        stopTicker()
        setProgress(1)
        // Allow the bar to finish animating before hiding
        setTimeout(() => {
          sessionActiveRef.current = false
          setShowLoadingUI(false)
        }, 150)
        pendingStopTimerRef.current = null
      }, 200)
    }
    const handleFailLoad = (e: any) => {
      // Ignore aborted loads (-3) which frequently occur during redirects
      if (e && typeof e.errorCode === 'number' && e.errorCode === -3) return
      stopTicker()
      setProgress(1)
      setTimeout(() => {
        sessionActiveRef.current = false
        setShowLoadingUI(false)
      }, 100)
    }
    const handleDomReady = () => setProgress((p) => (p < 0.9 ? 0.9 : p))
    const handleFaviconUpdated = (e: any) => {
      const rawFavicons: string[] = Array.isArray(e?.favicons) ? e.favicons : []
      const baseHref = (() => {
        try { return view.getURL() } catch { return undefined }
      })()
      // Resolve relative favicon URLs against the current page URL
      const resolvedFavicons = rawFavicons.map((u) => {
        try {
          if (/^data:/i.test(u)) return u
          return new URL(u, baseHref).href
        } catch {
          return u
        }
      })
      // Prefer common sizes or svg, otherwise first available
      const pick = resolvedFavicons.find((u) => /(32x32|favicon-32|apple-touch-icon|android-chrome-192x192|\.svg($|\?))/i.test(u))
        || resolvedFavicons.find((u) => /(16x16|favicon-16)/i.test(u))
        || resolvedFavicons[0]
      if (pick) updateTab(tabId, { favicon: pick })
    }
    view.addEventListener('did-navigate', syncUrl)
    view.addEventListener('did-navigate-in-page', syncUrl)
    view.addEventListener('page-title-updated', syncTitle)
    // Reset favicon on main-frame navigation start until we get an updated one
    const resetFaviconOnNav = (e: any) => {
      if (e && e.isMainFrame) updateTab(tabId, { favicon: undefined })
    }
    const handleDidStartNavigation = (e: any) => {
      if (e && e.isMainFrame) handleStartLoading()
    }
    view.addEventListener('did-start-navigation', handleDidStartNavigation)
    view.addEventListener('did-start-navigation', resetFaviconOnNav)
    view.addEventListener('did-stop-loading', handleStopLoading)
    view.addEventListener('did-fail-load', handleFailLoad)
    view.addEventListener('dom-ready', handleDomReady)
    view.addEventListener('page-favicon-updated', handleFaviconUpdated as any)
    return () => {
      view.removeEventListener('did-navigate', syncUrl)
      view.removeEventListener('did-navigate-in-page', syncUrl)
      view.removeEventListener('page-title-updated', syncTitle)
      view.removeEventListener('did-start-navigation', handleDidStartNavigation)
      view.removeEventListener('did-start-navigation', resetFaviconOnNav)
      view.removeEventListener('did-stop-loading', handleStopLoading)
      view.removeEventListener('did-fail-load', handleFailLoad)
      view.removeEventListener('dom-ready', handleDomReady)
      view.removeEventListener('page-favicon-updated', handleFaviconUpdated as any)
      stopTicker()
      if (pendingStopTimerRef.current !== null) {
        window.clearTimeout(pendingStopTimerRef.current)
        pendingStopTimerRef.current = null
      }
      if (showDelayTimerRef.current !== null) {
        window.clearTimeout(showDelayTimerRef.current)
        showDelayTimerRef.current = null
      }
    }
  }, [tabId, updateTab, endOpeningTab, openingTabId])

  return (
    <div className="flex flex-col w-full h-full">
      <BrowserTopBar
        url={url}
        onBack={handleBack}
        onForward={handleForward}
        onReload={handleReload}
        onStop={handleStop}
        isLoading={showLoadingUI}
        progress={progress}
        onSubmit={handleSubmit}
        onChange={() => {}}
      />
      <div className={`flex-1 min-h-0 ${heightClassName} relative`}>
        {/* Webview */}
        <webview
          ref={webviewRef as unknown as React.RefObject<any>}
          src={url || 'about:blank'}
          partition={partitionId}
          preload={webviewPreload}
          style={{ width: '100%', height: '100%' }}
          allowpopups
        />

        {/* Loading overlay when opening a new workspace */}
        {(() => {
          const containerVisible = openingTabId === tabId || showLoadingUI
          const visible = {
            setup: steps.setup,
            branch: steps.branch,
            start: steps.start,
            connect: steps.connect && showLoadingUI,
          }
          return (
            <AnimatePresence>
              {containerVisible && (
                <motion.div
                  key="workspace-loading-overlay"
                  className="absolute inset-0 bg-white dark:bg-neutral-900 pointer-events-none"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <WorkspaceLoadingSteps
                    setupCommand={currentTab?.setupCommand}
                    visible={visible}
                  />
                </motion.div>
              )}
            </AnimatePresence>
          )
        })()}

        <ElementSelector
          webviewRef={webviewRef}
          enabled={showElementSelector}
          onSelected={handleElementSelected}
          onRequestDisable={() => {
            onElementSelectorDismiss?.()
          }}
        />
      </div>
    </div>
  )
}


