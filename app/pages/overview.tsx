import { MessageSquare, Folder, Activity, Copy, Shield, ArrowRight, type LucideIcon } from 'lucide-react'
import { type PageProps } from '../registry'

interface Strip {
  id: string
  title: string
  desc: string
  icon: LucideIcon
  preview: () => React.ReactNode
}

const STRIPS: Strip[] = [
  {
    id: 'stream',
    title: 'Streaming',
    desc: 'Token-by-token, LLM-style, backpressure aware',
    icon: MessageSquare,
    preview: StreamPreview,
  },
  {
    id: 'analyzer',
    title: 'Folder analyzer',
    desc: 'Native dialog, then a streamed scan feeding a live treemap',
    icon: Folder,
    preview: AnalyzerPreview,
  },
  {
    id: 'system',
    title: 'System monitor',
    desc: 'CPU and memory, polled on an interval you own',
    icon: Activity,
    preview: MonitorPreview,
  },
  {
    id: 'store',
    title: 'Shared state',
    desc: 'One store, synced across every window',
    icon: Copy,
    preview: StorePreview,
  },
  {
    id: 'secure',
    title: 'Middleware',
    desc: 'Guards and context, composed per channel',
    icon: Shield,
    preview: MiddlewarePreview,
  },
]

export function Overview({ onNavigate }: PageProps) {
  return (
    <div className="px-10 pt-[34px] pb-10">
      {/* eyebrow */}
      <div className="mb-[26px] flex items-center gap-3">
        <span className="font-mono text-[10px] tracking-[0.08em] text-muted-foreground">CONVEYOR / OVERVIEW</span>
        <div className="h-px flex-1 bg-border" />
        <span className="rounded-[5px] border border-brand px-2 py-1 font-mono text-[10px] font-medium text-brand">
          electron-conveyor
        </span>
      </div>

      {/* hero */}
      <h1 className="max-w-[15ch] text-[52px] leading-[1.02] font-semibold tracking-[-0.035em]">
        Type-safe IPC,
        <br />
        one source of{' '}
        <span className="relative inline-block">
          <span className="absolute right-[-2px] bottom-[4px] left-[-2px] h-[11px] bg-brand opacity-90" />
          <span className="relative">truth.</span>
        </span>
      </h1>
      <p className="mt-5 max-w-[58ch] text-[15.5px] leading-[1.6] text-pretty text-muted-foreground">
        Cross-window state for Electron with end-to-end inference. Every page below is a real capability, running live,
        next to the code that drives it.
      </p>

      {/* capability strips */}
      <div className="mt-9 flex flex-col gap-[9px]">
        {STRIPS.map((s, i) => {
          const Icon = s.icon
          const Preview = s.preview
          return (
            <button
              key={s.id}
              onClick={() => onNavigate(s.id)}
              className="group flex transform-gpu items-center gap-4 rounded-xl border border-border bg-card px-[18px] py-4 text-left transition-transform duration-200 ease-out hover:translate-x-1 hover:border-brand"
            >
              <span className="w-4 flex-none font-mono text-[10px] text-muted-foreground/60">
                {String(i + 1).padStart(2, '0')}
              </span>
              <span className="flex size-[34px] flex-none items-center justify-center rounded-[9px] border border-border bg-muted text-brand">
                <Icon className="size-4" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-[14.5px] font-semibold tracking-[-0.01em]">{s.title}</span>
                <span className="mt-[3px] block text-[12.5px] leading-[1.4] text-muted-foreground">{s.desc}</span>
              </span>
              <span className="flex-none">
                <Preview />
              </span>
              <ArrowRight className="size-3.5 flex-none text-muted-foreground/60 transition-transform group-hover:translate-x-0.5" />
            </button>
          )
        })}
      </div>

      {/* branch footer */}
      <div className="mt-7 flex items-start gap-3.5 rounded-xl border border-dashed border-border-bright p-[18px]">
        <span className="mt-0.5 font-mono text-[10px] text-brand">BUILD</span>
        <p className="text-[12.5px] leading-[1.6] text-muted-foreground">
          You are on the <Code>demo</Code> branch. Ready to build your own app? Switch to <Code>main</Code> for the
          clean themed shell: <Code>git switch main</Code>, then <Code>npm install</Code>.
        </p>
      </div>
    </div>
  )
}

function Code({ children }: { children: React.ReactNode }) {
  return (
    <code className="rounded-[4px] bg-muted px-[5px] py-0.5 font-mono text-[11.5px] text-foreground/80">
      {children}
    </code>
  )
}

const Pill = ({ children, brand }: { children: React.ReactNode; brand?: boolean }) => (
  <span
    className={
      brand
        ? 'rounded-[5px] bg-brand-soft px-2 py-[3px] font-mono text-[10.5px] text-brand'
        : 'rounded-[5px] border border-border bg-muted px-2 py-[3px] font-mono text-[10.5px] text-muted-foreground'
    }
  >
    {children}
  </span>
)

function StreamPreview() {
  return (
    <span className="flex items-center gap-1.5 font-mono text-[10.5px] text-muted-foreground">
      <span className="opacity-40">the</span>
      <span className="opacity-70">quick</span>
      <span>brown</span>
      <span className="inline-block h-3 w-[5px] animate-pulse bg-brand" />
    </span>
  )
}
function AnalyzerPreview() {
  // A miniature treemap: share-weighted brand tints, same as the real one.
  const tiles = [58, 42, 30, 20] as const
  return (
    <span className="flex h-6 items-stretch gap-[2px]">
      {tiles.map((p, i) => (
        <span
          key={p}
          className="rounded-[3px]"
          style={{ width: `${26 - i * 5}px`, backgroundColor: `color-mix(in srgb, var(--brand) ${p}%, var(--card))` }}
        />
      ))}
    </span>
  )
}
function MonitorPreview() {
  return (
    <span className="flex items-center gap-2">
      <svg width="92" height="26" viewBox="0 0 92 26" fill="none" className="text-brand">
        <polyline
          points="0,20 12,14 24,17 36,8 48,12 60,5 72,15 84,10 92,13"
          stroke="currentColor"
          strokeWidth="1.5"
          fill="none"
        />
      </svg>
      <span className="font-mono text-[10.5px] font-medium text-muted-foreground">31%</span>
    </span>
  )
}
function StorePreview() {
  return (
    <span className="flex items-center gap-1.5">
      <Pill>win 1</Pill>
      <span className="font-mono text-brand">⇄</span>
      <Pill>win 2</Pill>
    </span>
  )
}
function MiddlewarePreview() {
  return (
    <span className="flex items-center gap-1.5">
      <Pill>auth</Pill>
      <Pill>log</Pill>
      <Pill brand>rate</Pill>
    </span>
  )
}
