import { useRef, useState } from 'react'
import { Send, Square } from 'lucide-react'
import { conveyor } from '@/conveyor/client'
import { Button } from '../components/button'
import { Input } from '@/app/components/ui/input'
import { Card } from '@/app/components/ui/card'
import { PageShell } from '../components/page-shell'

export function StreamPage() {
  const [prompt, setPrompt] = useState('Tell me why streaming matters')
  const [output, setOutput] = useState('')
  const [running, setRunning] = useState(false)
  const cancel = useRef<(() => void) | null>(null)

  const run = async () => {
    if (running) return
    setOutput('')
    setRunning(true)
    const iterator = conveyor.stream.respond(prompt)[Symbol.asyncIterator]()
    cancel.current = () => void iterator.return?.(undefined)
    try {
      for (;;) {
        const { value, done } = await iterator.next()
        if (done) break
        setOutput((o) => o + String(value))
      }
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
          {running && <span className="ml-0.5 inline-block h-4 w-1.75 translate-y-0.5 animate-pulse bg-foreground" />}
        </div>
      </Card>
    </PageShell>
  )
}
