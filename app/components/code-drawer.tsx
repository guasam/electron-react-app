import { X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { highlightLine } from './highlight'
import { SNIPPETS } from '../snippets'

/** Slide-over code panel: overlays the right of the content so the layout never reflows or cramps. */
export function CodeDrawer({
  capabilityId,
  open,
  onClose,
}: {
  capabilityId: string
  open: boolean
  onClose: () => void
}) {
  const snip = SNIPPETS[capabilityId] ?? SNIPPETS.overview
  const lines = snip.code.split('\n')

  return (
    <div
      aria-hidden={!open}
      className={cn(
        'absolute top-0 right-0 z-30 flex h-full w-110 max-w-[88%] flex-col border-l border-border bg-card shadow-2xl transition-transform duration-200 ease-out',
        open ? 'translate-x-0' : 'pointer-events-none translate-x-full'
      )}
    >
      <div className="flex h-10.5 flex-none items-center justify-between border-b border-border px-3">
        <span className="rounded-md bg-muted px-2.5 py-1.5 font-mono text-[11px] font-medium text-foreground/80">
          {snip.file}
        </span>
        <button
          onClick={onClose}
          aria-label="Close code"
          className="flex size-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <X className="size-4" />
        </button>
      </div>

      <div className="flex-1 overflow-auto bg-muted py-4 font-mono text-[12px] leading-[1.85]">
        {lines.map((line, i) => (
          <div key={i} className="flex gap-3.5 px-4 hover:bg-brand-soft">
            <span className="w-6 flex-none text-right text-muted-foreground/50 select-none">{i + 1}</span>
            <code className="whitespace-pre">{highlightLine(line)}</code>
          </div>
        ))}
      </div>

      <div className="flex-none border-t border-border bg-card px-4 py-3.5">
        <div className="flex items-center gap-3">
          <span className="font-mono text-[10px] tracking-[0.08em] text-muted-foreground">OUTPUT</span>
          <div className="h-px flex-1 bg-border" />
          <span className="font-mono text-[10px] text-success">ok</span>
        </div>
        <p className="mt-2 font-mono text-[11.5px] leading-[1.7] text-muted-foreground">{snip.output}</p>
      </div>
    </div>
  )
}
