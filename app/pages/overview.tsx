import { ArrowRight } from 'lucide-react'
import { type PageProps } from '../registry'
import { TipTicker } from '../components/tip-ticker'

interface Strip {
  id: string
  title: string
  desc: string
  preview: () => React.ReactNode
}

const STRIPS: Strip[] = [
  {
    id: 'stream',
    title: 'Streaming',
    desc: 'Token-by-token, LLM-style, backpressure aware',
    preview: StreamPreview,
  },
  {
    id: 'analyzer',
    title: 'Folder analyzer',
    desc: 'Native dialog, then a streamed scan feeding a live treemap',
    preview: AnalyzerPreview,
  },
  {
    id: 'system',
    title: 'System monitor',
    desc: 'CPU and memory, polled on an interval you own',
    preview: MonitorPreview,
  },
  {
    id: 'store',
    title: 'Shared state',
    desc: 'One store, synced across every window',
    preview: StorePreview,
  },
  {
    id: 'secure',
    title: 'Middleware',
    desc: 'Guards and context, composed per channel',
    preview: MiddlewarePreview,
  },
]

export function Overview({ onNavigate }: PageProps) {
  return (
    <div className="flex min-h-full flex-col">
      <div className="flex-1 px-10 pt-[60px] pb-10">
        {/* hero */}
        <h1 className="text-[2.6rem] leading-[1.08] font-semibold tracking-[-0.03em] text-balance">
          Electron React App
          <br />
          <span className="text-brand">demo branch!</span>
        </h1>
        <p className="mt-5 max-w-[58ch] text-[15.5px] leading-[1.6] text-pretty text-muted-foreground">
          Every page below is a real capability, running live next to the code that drives it. Pick one and try it.
        </p>

        {/* capability strips */}
        <div className="mt-9 flex flex-col gap-[9px]">
          {STRIPS.map((s, i) => {
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
      </div>

      <TipTicker onSelect={onNavigate} />
    </div>
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
