import type { CSSProperties } from 'react'
import { ArrowUpRight } from 'lucide-react'
import { conveyor } from '@/conveyor/client'
import { Card } from '../ui/card'
import { STACK, type StackEntry } from './stack'

// Scoped to this folder so the whole welcome screen still deletes without leaving CSS behind.
// The mark rests at a tilt and the shake swings around that angle, so it reads as jaunty when
// still rather than only in motion. Most of the cycle is rest: this is punctuation, not a spinner.
const WOBBLE_CSS = `
  @keyframes welcome-wobble {
    0%, 62%, 100% { transform: rotate(9deg); }
    66%  { transform: rotate(-5deg); }
    72%  { transform: rotate(20deg); }
    78%  { transform: rotate(2deg); }
    84%  { transform: rotate(14deg); }
    90%  { transform: rotate(7deg); }
  }
  .welcome-wobble {
    display: inline-block;
    transform: rotate(9deg);
    transform-origin: bottom center;
    animation: welcome-wobble 3.4s ease-in-out infinite;
  }
  @media (prefers-reduced-motion: reduce) {
    .welcome-wobble { animation: none; }
  }
`

/**
 * The landing panel. Deliberately unlike the per-technology panels: this is the first thing anyone
 * sees after cloning, so it leads with a headline rather than another row of the same list.
 */
export function Hero({ entry, onSelect }: { entry: StackEntry; onSelect: (id: string) => void }) {
  return (
    <div className="relative mx-auto max-w-3xl px-8 py-14">
      <style>{WOBBLE_CSS}</style>

      {/* Brand glow behind the headline. Non-interactive, and clipped by the scroll container. */}
      <div
        aria-hidden
        className="pointer-events-none absolute -top-40 -left-24 size-[26rem] rounded-full bg-brand/14 blur-[80px]"
      />

      <div className="relative">
        <div className="flex items-center gap-2">
          <span className="size-2.5 rounded-lg bg-brand ring-[3px] ring-brand/20" />
          <span className="font-mono text-[10.5px] tracking-[0.14em] text-muted-foreground/80 uppercase">
            Electron React App
          </span>
        </div>

        <h1 className="mt-5 text-[2.6rem] leading-[1.08] font-semibold tracking-[-0.03em] text-balance">
          Your desktop app
          <br />
          <span className="text-brand">
            starts here<span className="welcome-wobble">!</span>
          </span>
        </h1>

        <p className="mt-5 max-w-[52ch] text-[15.5px] leading-relaxed text-pretty text-muted-foreground">
          {entry.tagline}. The window, titlebar, menu, theming, and a fully typed bridge between processes are already
          working. Everything past that is yours.
        </p>

        <div className="mt-7 flex flex-wrap gap-1.5">
          {STACK.filter((e) => !e.hero).map((e) => (
            <button
              key={e.id}
              onClick={() => onSelect(e.id)}
              // Each chip carries its project's colour as a local variable, so one set of utility
              // classes tints seven different ways without generating seven sets of classes.
              style={{ '--tech': e.color } as CSSProperties}
              className="group relative overflow-hidden rounded-full border border-border bg-card px-2.75 py-1 font-mono text-[11px] text-muted-foreground transition-[color,border-color,box-shadow,transform] duration-200 hover:-translate-y-px hover:border-[var(--tech)] hover:text-foreground hover:shadow-[0_2px_14px_-4px_var(--tech)]"
            >
              <span
                aria-hidden
                className="absolute inset-0 bg-[linear-gradient(115deg,var(--tech),transparent_70%)] opacity-0 transition-opacity duration-200 group-hover:opacity-22"
              />
              <span className="relative flex items-center gap-1.75">
                <span className="size-1.5 rounded-full bg-[var(--tech)] opacity-55 transition-opacity duration-200 group-hover:opacity-100" />
                {e.label}
              </span>
            </button>
          ))}
        </div>

        <div className="mt-9 grid gap-2.5 sm:grid-cols-3">
          {entry.highlights.map((highlight) => (
            <Card key={highlight.title} className="gap-1.5 p-3.5">
              <div className="text-[13.5px] font-medium">{highlight.title}</div>
              <p className="text-[13px] leading-relaxed text-muted-foreground">{highlight.description}</p>
            </Card>
          ))}
        </div>

        <p className="mt-8 text-[13px] leading-relaxed text-muted-foreground/80">
          This screen is the one part meant to be thrown away. Delete{' '}
          <span className="font-mono text-foreground/70">app/components/welcome</span> and the{' '}
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
    </div>
  )
}
