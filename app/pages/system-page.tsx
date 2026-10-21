import { conveyor } from '@/conveyor/client'
import { Card } from '@/app/components/ui/card'
import { PageShell } from '../components/page-shell'

/** Matches the module's HISTORY_LENGTH, so the graph spans the same window while it fills up. */
const HISTORY_LENGTH = 60

export function SystemPage() {
  const info = conveyor.system.info.useQuery({ refetchInterval: 1000 })
  const d = info.data
  const cpuUsage = d?.cpuHistory.at(-1)

  return (
    <PageShell
      title="Live system monitor"
      description="A typed procedure reads real main-process system info; TanStack Query caches it and refetches every second. Watch the CPU graph move."
    >
      <div className="grid grid-cols-2 gap-4">
        <Stat label="Platform" value={d ? `${d.platform} · ${d.arch}` : '…'} />
        <Stat label="CPU cores" value={d ? String(d.cpuCount) : '…'} />
        <Stat label="OS uptime" value={d ? `${Math.floor(d.uptime / 3600)}h` : '…'} />
        <Stat label="Load (1m)" value={d ? d.loadAvg[0].toFixed(2) : '…'} />
      </div>
      <Card className="gap-0 p-4">
        <div className="flex items-baseline justify-between text-sm">
          <span className="text-muted-foreground">CPU usage</span>
          <span className="text-2xl font-semibold tabular-nums">{cpuUsage === undefined ? '…' : `${cpuUsage}%`}</span>
        </div>
        <CpuGraph values={d?.cpuHistory ?? []} />
        <div className="mt-2 truncate text-xs text-muted-foreground">{d?.cpuModel}</div>
      </Card>
    </PageShell>
  )
}

/** A rolling line of CPU usage, 0-100 top to bottom, newest sample pinned to the right edge. */
function CpuGraph({ values }: { values: number[] }) {
  const width = 100
  const height = 40
  const step = width / (HISTORY_LENGTH - 1)
  const offset = (HISTORY_LENGTH - values.length) * step
  const points = values.map((v, i) => `${(offset + i * step).toFixed(2)},${(height - (v / 100) * height).toFixed(2)}`)

  return (
    <svg viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" className="mt-3 h-20 w-full text-brand">
      <line x1="0" y1={height / 2} x2={width} y2={height / 2} className="stroke-border" strokeDasharray="2 2" />
      {points.length > 1 && (
        <polyline
          points={points.join(' ')}
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          vectorEffect="non-scaling-stroke"
        />
      )}
    </svg>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <Card className="gap-1 p-4">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="text-lg font-semibold tabular-nums">{value}</div>
    </Card>
  )
}
