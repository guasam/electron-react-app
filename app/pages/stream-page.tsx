import { useCallback, useRef, useState } from 'react'
import { KeyRound, Send, Square, X } from 'lucide-react'
import { conveyor } from '@/conveyor/client'
import { Button } from '../components/button'
import { Input } from '@/app/components/ui/input'
import { Card } from '@/app/components/ui/card'
import { PageShell } from '../components/page-shell'

/**
 * Paints streamed text at a steady rate. A fast model sends whole sentences per chunk, so painting
 * each one on arrival reads as a few jumps rather than typing — this buffers instead and drains a
 * few characters per frame. The rate scales with the backlog, so it never falls behind the stream.
 */
function useTypewriter() {
  const [text, setText] = useState('')
  const [draining, setDraining] = useState(false)
  const pending = useRef('')
  const frame = useRef<number | null>(null)

  const drain = useCallback(() => {
    const step = Math.max(1, Math.ceil(pending.current.length / 12))
    // Slice out before advancing the buffer: a functional updater runs after this frame's code,
    // so reading `pending.current` inside it would read the already-advanced remainder.
    const next = pending.current.slice(0, step)
    pending.current = pending.current.slice(step)
    setText((t) => t + next)
    if (pending.current) {
      frame.current = requestAnimationFrame(drain)
    } else {
      frame.current = null
      setDraining(false)
    }
  }, [])

  const push = useCallback(
    (chunk: string) => {
      pending.current += chunk
      setDraining(true)
      frame.current ??= requestAnimationFrame(drain)
    },
    [drain]
  )

  const reset = useCallback(() => {
    if (frame.current !== null) cancelAnimationFrame(frame.current)
    frame.current = null
    pending.current = ''
    setDraining(false)
    setText('')
  }, [])

  return { text, draining, push, reset }
}

export function StreamPage() {
  const [prompt, setPrompt] = useState('Tell me why streaming matters')
  const { text: output, draining, push, reset } = useTypewriter()
  const [error, setError] = useState<string | null>(null)
  const [running, setRunning] = useState(false)
  const [key, setKey] = useState('')
  const [keyError, setKeyError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const cancel = useRef<(() => void) | null>(null)
  const source = conveyor.stream.source.useQuery().data

  const saveKey = async () => {
    setKeyError(null)
    setSaving(true)
    try {
      await conveyor.stream.saveKey(key)
      setKey('')
      await conveyor.stream.source.invalidate()
    } catch (e) {
      // The key is verified in main before it is stored, so a rejection lands here, not on first send.
      setKeyError(e instanceof Error ? e.message : String(e))
    } finally {
      setSaving(false)
    }
  }

  const clearKey = async () => {
    await conveyor.stream.clearKey()
    await conveyor.stream.source.invalidate()
  }

  const run = async () => {
    if (running) return
    reset()
    setError(null)
    setRunning(true)
    const iterator = conveyor.stream.respond(prompt)[Symbol.asyncIterator]()
    // Stop kills the buffer too, so the tail doesn't keep typing after the stream is aborted.
    cancel.current = () => {
      void iterator.return?.(undefined)
      reset()
    }
    try {
      for (;;) {
        const { value, done } = await iterator.next()
        if (done) break
        push(String(value))
      }
    } catch (e) {
      // A live-mode failure (bad key, no network) surfaces here as a typed stream error.
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setRunning(false)
      cancel.current = null
    }
  }

  return (
    <PageShell
      badge="Streaming · stream()"
      title="Streaming responses"
      description="An async-generator handler pushes tokens to the renderer as they are produced (the exact pattern an LLM app needs), over one typed channel, with built-in cancellation."
    >
      <div className="flex min-h-9 flex-wrap items-center gap-1.5 text-xs">
        {source?.live ? (
          <>
            <span className="size-1.5 rounded-full bg-success" />
            <span className="text-success">live model</span>
            <span className="font-mono text-muted-foreground">· {source.model}</span>
            {source.from === 'stored' ? (
              <Button variant="ghost" size="sm" className="ml-1 h-6 px-2 text-xs" onClick={clearKey}>
                <X className="size-3" /> Forget key
              </Button>
            ) : (
              <span className="text-muted-foreground">· from GEMINI_API_KEY</span>
            )}
          </>
        ) : (
          <>
            <span className="size-1.5 rounded-full bg-muted-foreground/50" />
            <span className="text-muted-foreground">canned tokens</span>
            {source?.canStore ? (
              <div className="ml-1 flex items-center gap-1.5">
                <Input
                  type="password"
                  value={key}
                  onChange={(e) => setKey(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && key && saveKey()}
                  placeholder="Paste a Gemini API key"
                  autoComplete="off"
                  spellCheck={false}
                  className="h-7 w-64 text-xs"
                />
                <Button size="sm" className="h-7 px-2 text-xs" disabled={!key || saving} onClick={saveKey}>
                  <KeyRound className="size-3" /> {saving ? 'Checking…' : 'Use key'}
                </Button>
                <button
                  className="text-muted-foreground underline underline-offset-2 hover:text-foreground"
                  onClick={() => conveyor.web.openUrl('https://aistudio.google.com/apikey')}
                >
                  get one free
                </button>
              </div>
            ) : (
              <span className="text-muted-foreground">
                · no keychain here, so set <span className="font-mono">GEMINI_API_KEY</span> instead
              </span>
            )}
          </>
        )}
        {keyError && <span className="text-destructive">{keyError}</span>}
      </div>

      <Card className="gap-0 p-4">
        <div className="flex gap-2">
          <Input
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && run()}
            placeholder="Ask something…"
          />
          {running ? (
            <Button variant="secondary" onClick={() => cancel.current?.()}>
              <Square className="size-4" /> Stop
            </Button>
          ) : (
            <Button onClick={run}>
              <Send className="size-4" /> Send
            </Button>
          )}
        </div>
        <div className="mt-4 min-h-36 rounded-lg bg-muted/40 p-4 text-sm leading-relaxed whitespace-pre-wrap">
          {output || <span className="text-muted-foreground">The response streams in token by token…</span>}
          {(running || draining) && (
            <span className="ml-0.5 inline-block h-4 w-1.75 translate-y-0.5 animate-pulse bg-foreground" />
          )}
          {error && <div className="mt-2 text-xs text-destructive">{error}</div>}
        </div>
      </Card>
    </PageShell>
  )
}
