import React from 'react'
import { Button } from '../button'
import {
  MousePointer2,
  Camera,
  ArrowUp,
  AtSign
} from 'lucide-react'
import { ModeSelector } from './ModeSelector'
import { ModelSelector } from './ModelSelector'

interface ChatInputProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  disabled?: boolean
  onSend?: () => void
  // Optional model/mode selections
  modes?: string[]
  models?: string[]
  defaultMode?: string
  defaultModel?: string
  onModeChange?: (mode: string) => void
  onModelChange?: (model: string) => void
  onRequestElementSelector?: () => void
  isElementSelectorActive?: boolean
}

export const ChatInput: React.FC<ChatInputProps> = ({
  value,
  onChange,
  placeholder = "Plan, @ for context, / for commands",
  disabled = false,
  onSend,
  modes = ['Agent', 'Plan', 'Ask'],
  models = ['gpt-5', 'gpt-4.1', 'gpt-4o-mini'],
  defaultMode = 'Agent',
  defaultModel = 'gpt-5',
  onModeChange,
  onModelChange,
  onRequestElementSelector,
  isElementSelectorActive = false,
}) => {
  const textareaRef = React.useRef<HTMLTextAreaElement | null>(null)
  const containerRef = React.useRef<HTMLDivElement | null>(null)
  const MAX_HEIGHT_PX = 64 // ~max-h-16, about 2 lines for text-sm
  const BASE_HEIGHT_PX = 40  // ~min-h-10 for comfortable single-line height

  const [mode, setMode] = React.useState(defaultMode)
  const [model, setModel] = React.useState(defaultModel)

  // Compact UI flags determined by container width
  const [hideModel, setHideModel] = React.useState(false)
  const [hidePicker, setHidePicker] = React.useState(false)
  const [hideAt, setHideAt] = React.useState(false)
  const [hideCamera, setHideCamera] = React.useState(false)
  const [hideAgentText, setHideAgentText] = React.useState(false)

  const autoResize = () => {
    const el = textareaRef.current
    if (!el) return
    el.style.height = '0px'
    const nextHeight = Math.max(
      BASE_HEIGHT_PX,
      Math.min(el.scrollHeight, MAX_HEIGHT_PX)
    )
    el.style.height = `${nextHeight}px`
    el.style.overflowY = el.scrollHeight > MAX_HEIGHT_PX ? 'auto' : 'hidden'
  }

  const cycleMode = (direction: 1 | -1 = 1) => {
    if (!modes || modes.length === 0) return
    const currentIndex = modes.indexOf(mode)
    const nextIndex = currentIndex === -1
      ? 0
      : (currentIndex + direction + modes.length) % modes.length
    const nextMode = modes[nextIndex]
    setMode(nextMode)
    onModeChange?.(nextMode)
  }

  React.useEffect(() => {
    autoResize()
  }, [value])

  // Measure container width to progressively hide items by priority
  React.useEffect(() => {
    const el = containerRef.current
    if (!el) return

    const compute = () => {
      const w = el.clientWidth
      // thresholds tuned to typical icon widths; adjust as needed
      setHideModel(w < 320)
      setHidePicker(w < 260)
      setHideAt(w < 220)
      setHideCamera(w < 180)
      setHideAgentText(w < 140)
    }

    compute()
    const ro = new ResizeObserver(compute)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Cycle agent modes with Shift+Tab (previous)
    if (e.key === 'Tab' && e.shiftKey) {
      e.preventDefault()
      cycleMode(-1)
      return
    }

    // Cycle agent modes with Cmd+. (next) on macOS
    if (e.key === '.' && e.metaKey) {
      e.preventDefault()
      cycleMode(1)
      return
    }

    if (e.key === 'Enter' && !e.shiftKey && value.trim()) {
      e.preventDefault()
      onSend?.()
    }
  }

  return (
    <div className="p-4">
      {/* Block container that won't stretch to parent height */}
      <div ref={containerRef} className="w-full self-start rounded-2xl bg-white border border-[#ECEDED] shadow-sm px-3 py-2 dark:bg-neutral-800 dark:border-neutral-700">
        <div className="flex flex-col gap-2">
          <textarea
            ref={textareaRef}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            disabled={disabled}
            rows={1}
            className="chat-input-scroll w-full bg-transparent px-1
             py-2 text-sm placeholder:text-neutral-400 focus:outline-none dark:text-neutral-100 dark:placeholder:text-neutral-500 disabled:opacity-50 disabled:cursor-not-allowed resize-none max-h-16"
          />

          {/* Toolbar row: selectors on left, actions on right */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <ModeSelector
                value={mode}
                onChange={(m) => { setMode(m); onModeChange?.(m) }}
                modes={modes}
                disabled={disabled}
                hideText={hideAgentText}
              />
              {!hideModel && (
                <ModelSelector
                  value={model}
                  onChange={(m) => { setModel(m); onModelChange?.(m) }}
                  models={models}
                  disabled={disabled}
                />
              )}
            </div>

            {/* Action bar row anchored bottom-right */}
            <div className="flex items-center justify-end gap-1">
              {!hidePicker && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-8 text-neutral-400 hover:text-neutral-600 hover:bg-transparent dark:text-neutral-500 dark:hover:text-neutral-300 dark:hover:bg-transparent"
                  disabled={disabled || !onRequestElementSelector}
                  onClick={onRequestElementSelector}
                >
                  <MousePointer2 className={`size-4 ${isElementSelectorActive ? 'text-blue-400 dark:text-blue-500' : ''}`} />
                </Button>
              )}
              {!hideAt && (
                <Button 
                  variant="ghost" 
                  size="icon"
                  className="size-8 text-neutral-400 hover:text-neutral-600 hover:bg-transparent dark:text-neutral-500 dark:hover:text-neutral-300 dark:hover:bg-transparent"
                  disabled={disabled}
                >
                  <AtSign className="size-4" />
                </Button>
              )}
              {!hideCamera && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-8 text-neutral-400 hover:text-neutral-600 hover:bg-transparent dark:text-neutral-500 dark:hover:text-neutral-300 dark:hover:bg-transparent"
                  disabled={disabled}
                >
                  <Camera className="size-4" />
                </Button>
              )}
              <Button
                size="icon"
                className="size-8 rounded-full bg-neutral-900 text-white hover:bg-neutral-800 dark:bg-neutral-100 dark:text-neutral-900 dark:hover:bg-neutral-200"
                disabled={!value.trim() || disabled}
                onClick={onSend}
              >
                <ArrowUp className="size-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
