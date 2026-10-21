import { ArrowUpRight } from 'lucide-react'
import { conveyor } from '@/conveyor/client'
import { STACK, type StackEntry } from './stack'
import { TipTicker } from './tips'

/**
 * The landing panel. Deliberately unlike the per-technology panels: this is the first thing anyone
 * sees after cloning, so it leads with a headline rather than another row of the same list.
 */
export function Hero({ entry, onSelect }: { entry: StackEntry; onSelect: (id: string) => void }) {
  return (
    <div className="flex min-h-full flex-col">
      <div className="relative mx-auto w-full max-w-3xl flex-1 px-8 py-14">
        <h1 className="mt-5 text-[2.6rem] leading-[1.08] font-semibold tracking-[-0.03em] text-balance">
          Electron React App
          <br />
          <span className="text-brand">starter kit!</span>
        </h1>

        <p className="mt-5 max-w-[52ch] text-[15.5px] leading-relaxed text-pretty text-muted-foreground">
          {entry.tagline}. The window, titlebar, menu, theming, and a fully typed bridge between processes are already
          working. Everything past that is yours.
        </p>

        <div className="mt-7 flex flex-wrap gap-1.5">
          {STACK.filter((e) => !e.hero && !e.hideChip).map((e) => (
            <button
              key={e.id}
              onClick={() => onSelect(e.id)}
              className="flex cursor-pointer items-center gap-1.75 rounded-full border border-border bg-card px-2.75 py-1 font-mono text-[12px] text-muted-foreground transition-colors hover:border-brand/50 hover:text-foreground"
            >
              <span className="size-2 rounded-full bg-brand/60" />
              {e.label}
            </button>
          ))}
        </div>

        <p className="mt-8 text-[14px] leading-relaxed text-muted-foreground/80">
          This screen is the one part meant to be thrown away.
          <br />
          Delete <span className="font-mono text-foreground/70">app/components/welcome</span> and the{' '}
          <span className="font-mono text-foreground/70">&lt;Welcome /&gt;</span> line in{' '}
          <span className="font-mono text-foreground/70">app.tsx</span> for an empty window.
        </p>

        <button
          onClick={() => conveyor.web.openUrl(entry.docs)}
          className="mt-5 inline-flex items-center gap-1.5 text-[13px] text-muted-foreground transition-colors hover:text-brand"
        >
          Documentation
          <ArrowUpRight className="size-3.5" />
        </button>
      </div>

      <TipTicker onSelect={onSelect} />
    </div>
  )
}
