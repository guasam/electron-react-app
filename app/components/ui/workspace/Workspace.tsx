import React from 'react'
import BrowserFrame, { ElementSelectionContext } from '@/app/components/ui/browser/BrowserFrame'
import { ChatWindow } from '@/app/components/ChatWindow'
import TwoPaneLayout from '@/app/components/ui/chat/TwoPaneLayout'
import type { Tab } from '@/app/components/window/TabsContext'

export default function Workspace({ tab }: { tab: Tab }) {
  const [elementSelectorVisible, setElementSelectorVisible] = React.useState(false)
  const [elementContext, setElementContext] = React.useState<ElementSelectionContext | null>(null)

  const canInspect = Boolean(tab.git?.worktreePath)

  React.useEffect(() => {
    if (!canInspect && elementSelectorVisible) {
      setElementSelectorVisible(false)
    }
  }, [canInspect, elementSelectorVisible])

  const handleElementContext = React.useCallback((context: ElementSelectionContext) => {
    setElementContext(context)
    setElementSelectorVisible(false)
  }, [])

  const handleRequestSelector = React.useCallback(() => {
    if (!canInspect) return
    setElementSelectorVisible(prev => !prev)
  }, [canInspect])

  return (
    <TwoPaneLayout
      rightContent={
        <ChatWindow
          elementContext={elementContext}
          onRequestElementSelector={canInspect ? handleRequestSelector : undefined}
          isElementSelectorActive={elementSelectorVisible && canInspect}
        />
      }
      leftContent={
        <BrowserFrame
          tabId={tab.id}
          partitionId={tab.partitionId}
          initialUrl={tab.url && tab.url.length > 0 ? tab.url : ''}
          workspacePath={tab.git?.worktreePath}
          showElementSelector={elementSelectorVisible && canInspect}
          onElementSelectorRequest={canInspect ? handleRequestSelector : undefined}
          onElementSelectorDismiss={() => setElementSelectorVisible(false)}
          onElementContext={handleElementContext}
        />
      }
    />
  )
}