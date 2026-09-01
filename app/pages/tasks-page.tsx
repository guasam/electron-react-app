import { useState } from 'react'
import { Play, Loader2 } from 'lucide-react'
import { conveyor } from '@/conveyor/client'
import { Button } from '../components/button'
import { Card } from '@/app/components/ui/card'
import { PageShell } from '../components/page-shell'
import { formatBytes } from '../components/format'

interface Progress {
  percent: number
  current: string
  files: number
  bytes: number
  done: boolean
}

export function TasksPage() {
  const [p, setP] = useState<Progress | null>(null)
  const running = p ? !p.done : false

  conveyor.tasks.onProgress.useEvent((next) => setP(next))

  const run = () => {
    if (running) return
    setP({ percent: 0, current: 'Walking the app directory...', files: 0, bytes: 0, done: false })
    conveyor.tasks.run()
  }

  return (
    <PageShell
      badge="Events · useEvent()"
      title="Background task progress"
      description="A fire-and-forget call starts a real directory scan in the main process (reading the filesystem, which the renderer can't). It pushes genuine progress back through a typed event: the actual file it's on, and the running file and byte totals."
    >
      <Card className="gap-0 p-5">
        <div className="flex items-center justify-between">
          <Button onClick={run} disabled={running}>
            {running ? <Loader2 className="size-4 animate-spin" /> : <Play className="size-4" />}
            {running ? 'Scanning...' : 'Run task'}
          </Button>
          <span className="font-mono text-sm tabular-nums text-muted-foreground">{p ? `${p.percent}%` : ''}</span>
        </div>

        <div className="mt-4 h-2.5 overflow-hidden rounded-full bg-muted">
          <div
            className="h-full bg-brand transition-[width] duration-100 ease-linear"
            style={{ width: `${p?.percent ?? 0}%` }}
          />
        </div>

        {p ? (
          <div className="mt-3 space-y-1">
            <div className="truncate font-mono text-xs text-foreground/70">{p.done ? 'Scan complete' : p.current}</div>
            <div className="font-mono text-xs text-muted-foreground">
              {p.files} files · {formatBytes(p.bytes)} read in main
            </div>
          </div>
        ) : (
          <div className="mt-3 text-xs text-muted-foreground">
            Run the task to watch main walk the filesystem and stream progress back.
          </div>
        )}
      </Card>
    </PageShell>
  )
}
