import React from 'react'
import { Settings, History, LogOut } from 'lucide-react'
import { ChatInput } from './ui/chat/ChatInput'
import { Button } from './ui/button'
import type { ElementSelectionContext } from '@/app/components/ui/browser/BrowserFrame'

interface ChatWindowProps {
  elementContext?: ElementSelectionContext | null
  onRequestElementSelector?: () => void
  isElementSelectorActive?: boolean
}

export const ChatWindow: React.FC<ChatWindowProps> = ({ elementContext, onRequestElementSelector, isElementSelectorActive = false }) => {
  const [inputValue, setInputValue] = React.useState('')
  const lastContextKey = React.useRef<string | null>(null)

  React.useEffect(() => {
    if (!elementContext) return

    const keyParts = [
      elementContext.element?.tagName,
      elementContext.element?.id,
      elementContext.element?.className,
      elementContext.codeSnippet?.relativePath,
      elementContext.codeSnippet?.startLine,
      elementContext.codeSnippet?.endLine,
    ]
    const key = keyParts.filter(Boolean).join('|')
    if (lastContextKey.current === key) return

    if (elementContext.codeSnippet) {
      const header = `@${elementContext.codeSnippet.relativePath}:${elementContext.codeSnippet.startLine}-${elementContext.codeSnippet.endLine}`
      setInputValue((prev) => {
        const needsSpacer = prev.length > 0 && !prev.endsWith('\n')
        const spacer = prev.length === 0 ? '' : needsSpacer ? '\n\n' : '\n'
        return `${prev}${spacer}${header}\n\u0060\u0060\u0060\n${elementContext.codeSnippet.code}\n\u0060\u0060\u0060\n`
      })
    } else {
      const labelParts = [elementContext.element.tagName]
      if (elementContext.element.id) labelParts.push(`#${elementContext.element.id}`)
      if (elementContext.element.className) labelParts.push(`.${elementContext.element.className.replace(/\s+/g, '.')}`)
      const fallbackLabel = labelParts.join('')
      setInputValue((prev) => {
        const needsSpacer = prev.length > 0 && !prev.endsWith('\n')
        const spacer = prev.length === 0 ? '' : needsSpacer ? '\n\n' : '\n'
        return `${prev}${spacer}// Element selected: ${fallbackLabel} — source not located\n`
      })
    }

    lastContextKey.current = key
  }, [elementContext])

  const handleSend = () => {
    if (inputValue.trim()) {
      // Handle send logic here
      setInputValue('')
    }
  }

  return (
    <div className="flex h-full w-full flex-col bg-neutral-50 dark:bg-neutral-900 rounded-2xl overflow-hidden relative">
      {/* Header with icons only */}
      <div className="px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" className="size-8 text-neutral-500 hover:text-neutral-700 hover:bg-neutral-100 dark:text-neutral-400 dark:hover:text-neutral-200 dark:hover:bg-neutral-800/50">
              <LogOut className="size-4" />
            </Button>
          </div>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" className="size-8 text-neutral-500 hover:text-neutral-700 hover:bg-neutral-100 dark:text-neutral-400 dark:hover:text-neutral-200 dark:hover:bg-neutral-800/50">
              <History className="size-4" />
            </Button>
            <Button variant="ghost" size="icon" className="size-8 text-neutral-500 hover:text-neutral-700 hover:bg-neutral-100 dark:text-neutral-400 dark:hover:text-neutral-200 dark:hover:bg-neutral-800/50">
              <Settings className="size-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Chat Messages Area */}
      <div className="flex-1 overflow-y-auto p-4">
        {/* Chat messages will go here */}
      </div>

      <ChatInput
        value={inputValue}
        onChange={setInputValue}
        onSend={handleSend}
        onRequestElementSelector={onRequestElementSelector}
        isElementSelectorActive={isElementSelectorActive}
      />
    </div>
  )
}
