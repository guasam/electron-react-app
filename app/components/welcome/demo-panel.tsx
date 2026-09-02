import { useEffect, useRef, useState, type ReactNode } from 'react'
import {
  Activity,
  Check,
  Code2,
  Copy,
  FolderSearch,
  MessageSquare,
  MousePointer2,
  ShieldCheck,
  StickyNote,
  type LucideIcon,
} from 'lucide-react'
import { Button } from '../ui/button'
import { Card } from '../ui/card'

/** The id this panel answers to. Not a stack entry, so it lives outside STACK. */
export const DEMO_ID = 'demo'

const COMMANDS = ['git switch demo', 'npm install', 'npm run dev']

// Blurbs stay under ~35 characters so each card holds one line at the two-column width.
const PAGES: { icon: LucideIcon; label: string; blurb: string }[] = [
  { icon: MessageSquare, label: 'Streaming', blurb: 'Live model replies, token by token' },
  { icon: FolderSearch, label: 'Folder analyzer', blurb: 'Native dialog, then a streamed scan' },
  { icon: Activity, label: 'System monitor', blurb: 'CPU and memory, polled from main' },
  { icon: StickyNote, label: 'Shared state', blurb: 'One store, mirrored across windows' },
  { icon: ShieldCheck, label: 'Middleware', blurb: 'Guarded calls, typed errors' },
  { icon: MousePointer2, label: 'Ghost cursors', blurb: 'Pointer presence between windows' },
]

/** What the demo branch holds, and how to get to it. Reached from the sidebar's promo card. */
export function DemoPanel() {
  return (
    <div className="mx-auto max-w-3xl px-8 py-10">
      <div className="mb-7">
        <span className="inline-block rounded-full border border-brand/30 bg-brand-soft px-2.5 py-0.5 font-mono text-[11px] text-brand">
          demo branch
        </span>
        <h1 className="mt-3 text-2xl font-semibold tracking-tight">See the whole thing running</h1>
        <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
          The same shell you are looking at, with a page per primitive. Each one is a working feature rather than a
          snippet, and a drawer shows the real source behind it.
        </p>
      </div>

      <div className="grid gap-2.5 sm:grid-cols-2">
        {PAGES.map((page) => (
          <Card key={page.label} className="gap-1.5 p-3.5">
            <div className="flex items-center gap-2 text-[13.5px] font-medium">
              <page.icon className="size-4 text-brand" />
              {page.label}
            </div>
            <p className="text-[13px] leading-relaxed text-muted-foreground">{page.blurb}</p>
          </Card>
        ))}
      </div>

      <div className="mt-7">
        <div className="flex items-center gap-2 text-[13.5px] font-medium">
          <Code2 className="size-4 text-muted-foreground" />
          How to get there
        </div>

        <ol className="mt-2.5 space-y-1.5 text-[13px] leading-relaxed text-muted-foreground">
          <Step n={1}>
            Close this window, then stop the dev server with <Kbd>Ctrl</Kbd> <Kbd>C</Kbd> in the terminal running it.
            Switching branches underneath a running build leaves it half rebuilt.
          </Step>
          <Step n={2}>Run these three commands. The demo branch carries extra dependencies, hence the install.</Step>
        </ol>

        <CommandBlock />

        <p className="mt-3 text-[13px] leading-relaxed text-muted-foreground">
          Nothing is lost by looking. Everything on this branch is on that one too, and{' '}
          <span className="font-mono text-foreground/80">git switch main</span> brings you back the same way.
        </p>
      </div>
    </div>
  )
}

/** A numbered step, with the marker held out of the text flow so wrapped lines stay aligned. */
function Step({ n, children }: { n: number; children: ReactNode }) {
  return (
    <li className="flex gap-2.5">
      <span className="mt-px flex size-4.5 flex-none items-center justify-center rounded-full border border-border bg-muted font-mono text-[10px] text-foreground/70">
        {n}
      </span>
      <span>{children}</span>
    </li>
  )
}

/** A key cap, for the one instruction that is a keystroke rather than a command. */
function Kbd({ children }: { children: ReactNode }) {
  return (
    <kbd className="rounded border border-border bg-muted px-1 py-px font-mono text-[11px] text-foreground/80">
      {children}
    </kbd>
  )
}

/** The checkout commands, copied as one block. */
function CommandBlock() {
  const [copied, setCopied] = useState(false)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // The reset is scheduled, so it has to be cancelled if the screen goes away first.
  useEffect(() => () => void (timer.current && clearTimeout(timer.current)), [])

  const copy = async () => {
    await navigator.clipboard.writeText(COMMANDS.join('\n'))
    setCopied(true)
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(() => setCopied(false), 1500)
  }

  return (
    // Full `muted` rather than a wash of it: at 40% this sat within a shade of the page background
    // on the dark theme and read as a smudge. The border carries it on light, where muted is close
    // to the background instead.
    <div className="relative mt-3 rounded-lg border border-border bg-muted p-3.5">
      <pre className="font-mono text-xs leading-6 text-foreground/90">{COMMANDS.join('\n')}</pre>
      <Button
        variant="ghost"
        size="icon"
        className="absolute top-1.5 right-1.5 size-7"
        onClick={copy}
        aria-label="Copy commands"
      >
        {copied ? <Check className="size-3.5 text-success" /> : <Copy className="size-3.5" />}
      </Button>
    </div>
  )
}
