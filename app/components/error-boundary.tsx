import { Component, useEffect, useRef, useState, type ErrorInfo, type ReactNode } from 'react'
import { Check, Copy, RotateCw, TriangleAlert } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from './ui/button'
import { ScrollArea, ScrollBar } from './ui/scroll-area'
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs'

interface Props {
  children: ReactNode
  fallback?: ReactNode
}

interface State {
  error?: Error
  /** React's own component stack for the throw. Only a boundary can see it, so never drop it. */
  componentStack?: string
}

// ================================================================
// BOUNDARY
// ================================================================

/**
 * Catches render-phase errors and shows what a developer actually needs: the error, where it was
 * thrown, and which component threw it. Pass `fallback` to replace the whole screen.
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = {}

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // Also log it: the panel is one view, but devtools is where a breakpoint or "pause on caught
    // exceptions" actually lives, and console preserves the live object rather than a string.
    console.error('[error-boundary]', error, info.componentStack)
    this.setState({ componentStack: info.componentStack ?? undefined })
  }

  render() {
    if (!this.state.error) return this.props.children
    if (this.props.fallback) return this.props.fallback
    return (
      <ErrorScreen
        error={this.state.error}
        componentStack={this.state.componentStack}
        onRetry={() => this.setState({ error: undefined, componentStack: undefined })}
      />
    )
  }
}

// ================================================================
// SCREEN
// ================================================================

function ErrorScreen({
  error,
  componentStack,
  onRetry,
}: {
  error: Error
  componentStack?: string
  onRetry: () => void
}) {
  // Errors carrying a `code` (conveyor's, and most typed error classes) tell you far more than the
  // message does. Read it structurally rather than importing the class, so any of them work.
  const code =
    typeof (error as { code?: unknown }).code === 'string' ? (error as unknown as { code: string }).code : null

  const report = [
    `${error.name}: ${error.message}`,
    code ? `code: ${code}` : '',
    error.stack ? `\n${error.stack}` : '',
    componentStack ? `\ncomponent stack:${componentStack}` : '',
  ]
    .filter(Boolean)
    .join('\n')

  return (
    <div className="h-screen overflow-auto bg-background text-foreground">
      <div className="mx-auto max-w-3xl px-8 py-10">
        {/* The mark sits opposite the text rather than in front of it: the message is what you read
            first, and the icon only has to say which kind of screen this is. */}
        <div className="flex items-start gap-4">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-mono text-[10.5px] tracking-[0.14em] text-brand uppercase">Runtime error</span>
              {code && (
                <span className="rounded-full border border-brand/30 bg-brand-soft px-2 py-0.5 font-mono text-[10.5px] text-brand">
                  {code}
                </span>
              )}
            </div>
            {/* The message leads, not the class name: `Error` tells you nothing, the message does. */}
            <h1 className="mt-1.5 text-xl leading-snug font-semibold tracking-tight break-words">
              {error.message || 'No message was attached to this error.'}
            </h1>
            <p className="mt-1 font-mono text-[12px] text-muted-foreground">{error.name}, thrown during render</p>
          </div>

          <span className="mt-0.5 flex size-9 flex-none items-center justify-center rounded-[9px] border border-brand/30 bg-brand-soft">
            <TriangleAlert className="size-4.5 text-brand" />
          </span>
        </div>

        <div className="mt-6 flex items-center gap-2">
          <Button size="sm" variant="secondary" onClick={onRetry}>
            <RotateCw className="size-3.5" /> Try again
          </Button>
          <Button size="sm" variant="outline" onClick={() => window.location.reload()}>
            Reload window
          </Button>
          <div className="flex-1" />
          <CopyButton value={report} />
        </div>

        <Tabs defaultValue="stack" className="mt-6">
          <TabsList>
            <TabsTrigger value="stack">Stack</TabsTrigger>
            <TabsTrigger value="components" disabled={!componentStack}>
              Components
            </TabsTrigger>
          </TabsList>

          <TabsContent value="stack">
            <Frames text={error.stack ?? 'No stack was attached to this error.'} />
          </TabsContent>
          <TabsContent value="components">
            <Frames text={componentStack ?? ''} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}

// ================================================================
// PARTS
// ================================================================

// Anything from a dependency or the runtime itself. Almost never where the bug is, so it recedes
// and lets your own frames carry the eye.
const EXTERNAL = /node_modules|node:internal|chrome-extension:|\/electron\/js2c\//

/**
 * A stack rendered line by line, with dependency and runtime frames dimmed. Capped rather than
 * stretched: filling the viewport left a short trace floating in a mostly empty box.
 */
function Frames({ text }: { text: string }) {
  const lines = text.split('\n')

  return (
    <ScrollArea className="mt-2.5 max-h-[52vh] rounded-lg border border-border bg-muted">
      <pre className="p-3.5 font-mono text-[12px] leading-[1.7] select-text">
        {lines.map((line, i) => (
          <div key={i} className={cn('break-all', EXTERNAL.test(line) && 'text-muted-foreground/45')}>
            {line || ' '}
          </div>
        ))}
      </pre>
      <ScrollBar orientation="horizontal" />
    </ScrollArea>
  )
}

/** Copies the whole report: message, code, stack, and component stack in one paste. */
function CopyButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => () => void (timer.current && clearTimeout(timer.current)), [])

  const copy = async () => {
    await navigator.clipboard.writeText(value)
    setCopied(true)
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(() => setCopied(false), 1500)
  }

  return (
    <Button size="sm" variant="outline" onClick={copy}>
      {copied ? <Check className="size-3.5 text-success" /> : <Copy className="size-3.5" />}
      {copied ? 'Copied' : 'Copy report'}
    </Button>
  )
}
