import { useRef, useState } from 'react'
import { FolderSearch, RefreshCw, Square } from 'lucide-react'
import { conveyor } from '@/conveyor/client'
import { Button } from '../components/button'
import { Card } from '@/app/components/ui/card'
import { PageShell } from '../components/page-shell'
import { formatBytes } from '../components/format'
import { Treemap } from '../components/treemap'

// Chunk types derived from the client, same as everything else on this page's wire.
type ScanChunk = typeof conveyor.analyzer.scan extends (input: string) => AsyncIterable<infer C> ? C : never
type ScanProgress = Extract<ScanChunk, { kind: 'progress' }>
type ScanResult = Extract<ScanChunk, { kind: 'done' }>

export function AnalyzerPage() {
  const [folder, setFolder] = useState<string | null>(null)
  const [progress, setProgress] = useState<ScanProgress | null>(null)
  const [result, setResult] = useState<ScanResult | null>(null)
  const [scanning, setScanning] = useState(false)
  const cancel = useRef<(() => void) | null>(null)

  const scan = async (path: string) => {
    setResult(null)
    setProgress(null)
    setScanning(true)
    const iterator = conveyor.analyzer.scan(path)[Symbol.asyncIterator]()
    cancel.current = () => void iterator.return?.(undefined)
    try {
      for (;;) {
        const { value, done } = await iterator.next()
        if (done) break
        if (value.kind === 'progress') setProgress(value)
        else setResult(value)
      }
    } finally {
      setScanning(false)
      cancel.current = null
    }
  }

  const pick = async () => {
    const path = await conveyor.analyzer.pick()
    if (!path) return
    setFolder(path)
    scan(path)
  }

  return (
    <PageShell
      badge="Command + Stream · analyzer.scan()"
      title="Folder analyzer"
      description="A typed command opens the native folder dialog, then a stream walks the folder in the main process and pushes live progress until the size breakdown arrives. Try a projects folder; node_modules never disappoints."
    >
      <div className="flex items-center gap-3">
        {scanning ? (
          <Button variant="secondary" onClick={() => cancel.current?.()}>
            <Square className="size-4" /> Stop
          </Button>
        ) : (
          <Button onClick={pick}>
            <FolderSearch className="size-4" /> {folder ? 'Choose another folder...' : 'Choose a folder...'}
          </Button>
        )}
        {folder && !scanning && (
          <Button variant="ghost" size="icon" onClick={() => scan(folder)} aria-label="Rescan">
            <RefreshCw className="size-4" />
          </Button>
        )}
        {folder && <span className="truncate font-mono text-xs text-muted-foreground">{folder}</span>}
      </div>

      {scanning && (
        <Card className="gap-0 p-4">
          <div className="flex items-baseline gap-4">
            <span className="font-mono text-2xl font-semibold tabular-nums text-brand">
              {(progress?.files ?? 0).toLocaleString()}
            </span>
            <span className="text-sm text-muted-foreground">files</span>
            <span className="font-mono text-sm tabular-nums text-muted-foreground">
              {formatBytes(progress?.bytes ?? 0)}
            </span>
          </div>
          <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-muted">
            <div className="h-full w-1/3 animate-pulse rounded-full bg-brand" />
          </div>
          <div className="mt-2 truncate font-mono text-xs text-muted-foreground">{progress?.current ?? '...'}</div>
        </Card>
      )}

      {result && (
        <Card className="gap-3 p-4">
          <div className="flex items-baseline justify-between text-sm">
            <span className="font-medium">
              {formatBytes(result.totalBytes)}
              <span className="text-muted-foreground"> · {result.totalFiles.toLocaleString()} files</span>
            </span>
            <span className="text-xs text-muted-foreground">hover a tile for details</span>
          </div>
          {result.entries.length > 0 ? (
            <Treemap items={result.entries} />
          ) : (
            <div className="rounded-lg bg-muted/40 p-4 text-sm text-muted-foreground">
              Nothing readable in this folder.
            </div>
          )}
        </Card>
      )}

      {!scanning && !result && (
        <div className="text-xs text-muted-foreground">
          Everything runs in main: the renderer only ever sees names and sizes, never file contents.
        </div>
      )}
    </PageShell>
  )
}
