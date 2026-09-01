import { useState } from 'react'
import { Plus, Minus, X, PanelLeftOpen } from 'lucide-react'
import { useConveyorStore, useConveyorActions } from 'electron-conveyor/react'
import { conveyor } from '@/conveyor/client'
import { sharedStore } from '@/conveyor/stores/shared'
import { cn } from '@/lib/utils'
import { Button } from '../components/button'
import { Input } from '@/app/components/ui/input'
import { Card } from '@/app/components/ui/card'
import { PageShell } from '../components/page-shell'

export function StorePage() {
  const count = useConveyorStore(sharedStore, (s) => s.count)
  const notes = useConveyorStore(sharedStore, (s) => s.notes)
  const { increment, decrement, add, remove, clear } = useConveyorActions(sharedStore)
  const [text, setText] = useState('')

  const windowCount = conveyor.windows.count.useQuery({ refetchInterval: 800 }).data ?? 1
  const ready = windowCount > 1

  const submit = () => {
    const note = text.trim()
    if (!note) return
    add(note)
    conveyor.notify.toOthers(`New note added: "${note}"`)
    setText('')
  }

  return (
    <PageShell
      badge="Cross-window store · defineStore"
      title="Shared state across windows"
      description="Main owns the state; every window mirrors it live. Open a second window, then change the counter or notes and watch both windows stay in sync."
    >
      <div className="flex items-center gap-3">
        <Button
          variant={ready ? 'outline' : 'default'}
          className="w-fit"
          onClick={() => conveyor.windows.open('store')}
        >
          <PanelLeftOpen className="size-4" /> Open 2nd window
        </Button>
        {ready ? (
          <span className="flex items-center gap-1.5 text-xs text-success">
            <span className="size-1.5 rounded-full bg-success" />
            {windowCount} windows connected
          </span>
        ) : (
          <span className="text-xs text-muted-foreground">Open a second window to unlock the shared state below.</span>
        )}
      </div>

      <div
        className={cn(
          'space-y-5 transition-opacity duration-300',
          !ready && 'pointer-events-none opacity-40 select-none'
        )}
      >
        {/* shared counter */}
        <Card className="flex-row items-center justify-between gap-4 p-4">
          <div>
            <div className="text-xs text-muted-foreground">Shared counter</div>
            <div className="mt-0.5 font-mono text-3xl font-semibold tabular-nums text-brand">{count}</div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" onClick={() => decrement()} aria-label="Decrement">
              <Minus className="size-4" />
            </Button>
            <Button variant="outline" size="icon" onClick={() => increment()} aria-label="Increment">
              <Plus className="size-4" />
            </Button>
          </div>
        </Card>

        {/* shared notes */}
        <Card className="gap-0 p-4">
          <div className="flex gap-2">
            <Input
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && submit()}
              placeholder="Add a note..."
            />
            <Button onClick={submit}>
              <Plus className="size-4" /> Add
            </Button>
          </div>

          <ul className="mt-4 space-y-1.5">
            {notes.length === 0 ? (
              <li className="rounded-lg bg-muted/40 p-3 text-sm text-muted-foreground">No notes yet.</li>
            ) : (
              notes.map((note, i) => (
                <li key={i} className="flex items-center gap-2 rounded-lg bg-muted/40 px-3 py-2 text-sm">
                  <span className="flex-1">{note}</span>
                  <button
                    onClick={() => remove(i)}
                    className="text-muted-foreground transition-colors hover:text-destructive"
                    aria-label="Remove"
                  >
                    <X className="size-4" />
                  </button>
                </li>
              ))
            )}
          </ul>
          {notes.length > 0 && (
            <button onClick={() => clear()} className="mt-3 w-fit text-xs text-muted-foreground hover:text-foreground">
              Clear all
            </button>
          )}
        </Card>
      </div>
    </PageShell>
  )
}
