import { useState } from 'react'
import { FolderOpen, FileWarning } from 'lucide-react'
import { conveyor } from '@/conveyor/client'
import { Button } from '../components/button'
import { Card } from '@/app/components/ui/card'
import { PageShell } from '../components/page-shell'
import { formatBytes } from '../components/format'

type FileResult = Awaited<ReturnType<typeof conveyor.files.open>>

export function FilesPage() {
  const [file, setFile] = useState<FileResult>(null)
  const [loading, setLoading] = useState(false)

  const open = async () => {
    setLoading(true)
    try {
      setFile(await conveyor.files.open())
    } finally {
      setLoading(false)
    }
  }

  return (
    <PageShell
      badge="Command · command()"
      title="Native file access"
      description="A typed renderer-to-main command that opens the OS file picker and reads the chosen file as text. Pick a text file (code, JSON, markdown); binary files show their size only."
    >
      <Card className="gap-0 p-4">
        <Button onClick={open} disabled={loading} className="w-fit">
          <FolderOpen className="size-4" /> {loading ? 'Opening...' : 'Open a text file...'}
        </Button>
        {file && (
          <div className="mt-4 space-y-2">
            <div className="text-sm">
              <span className="font-medium">{file.name}</span>
              <span className="text-muted-foreground"> · {formatBytes(file.size)}</span>
            </div>
            {file.binary ? (
              <div className="flex items-center gap-2 rounded-lg bg-muted/40 p-3 text-sm text-muted-foreground">
                <FileWarning className="size-4 shrink-0" />
                Binary file, preview hidden. Try a text file like a .json or .md.
              </div>
            ) : (
              <pre className="max-h-72 overflow-auto rounded-lg bg-muted/40 p-3 text-xs leading-relaxed">
                {file.content || '(empty file)'}
                {file.truncated && '\n\n... preview truncated'}
              </pre>
            )}
          </div>
        )}
      </Card>
    </PageShell>
  )
}
