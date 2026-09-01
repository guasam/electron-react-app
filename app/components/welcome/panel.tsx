import type { CSSProperties } from 'react'
import { ArrowUpRight } from 'lucide-react'
import { conveyor } from '@/conveyor/client'
import { Card } from '../ui/card'
import type { StackEntry } from './stack'

/** The right-hand reading pane for one stack entry. */
export function Panel({ entry }: { entry: StackEntry }) {
  const Icon = entry.icon

  return (
    <div className="mx-auto max-w-3xl px-8 py-10">
      <div className="mb-7">
        <div className="flex items-center gap-3">
          <span
            style={{ '--tech': entry.color } as CSSProperties}
            className="flex size-9 items-center justify-center rounded-[9px] border border-[var(--tech)]/35 bg-[var(--tech)]/12"
          >
            <Icon className="size-4.5 text-[var(--tech)]" />
          </span>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">{entry.label}</h1>
            <p className="mt-0.5 text-sm text-muted-foreground">{entry.tagline}</p>
          </div>
        </div>
      </div>

      <div className="space-y-3.5">
        {entry.body.map((paragraph) => (
          <p key={paragraph} className="text-[14.5px] leading-relaxed text-foreground/80">
            {paragraph}
          </p>
        ))}
      </div>

      <div className="mt-7 grid gap-2.5 sm:grid-cols-3">
        {entry.highlights.map((highlight) => (
          <Card key={highlight.title} className="gap-1.5 p-3.5">
            <div className="text-[13.5px] font-medium">{highlight.title}</div>
            <p className="text-[13px] leading-relaxed text-muted-foreground">{highlight.description}</p>
          </Card>
        ))}
      </div>

      <button
        onClick={() => conveyor.web.openUrl(entry.docs)}
        className="mt-6 inline-flex items-center gap-1.5 text-[13px] text-muted-foreground transition-colors hover:text-brand"
      >
        Documentation
        <ArrowUpRight className="size-3.5" />
      </button>
    </div>
  )
}
