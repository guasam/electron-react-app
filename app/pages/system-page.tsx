import { conveyor } from '@/conveyor/client'
import { Card } from '@/app/components/ui/card'
import { PageShell } from '../components/page-shell'
import { formatBytes } from '../components/format'

export function SystemPage() {
  const info = conveyor.system.info.useQuery({ refetchInterval: 1500 })
  const d = info.data
  const usedPct = d ? Math.round(((d.totalMem - d.freeMem) / d.totalMem) * 100) : 0

  return (
    <PageShell
      badge="Query · useQuery()"
      title="Live system monitor"
      description="A typed procedure reads real main-process system info; TanStack Query caches it and refetches every 1.5s. Watch the memory bar move."
    >
      <div className="grid grid-cols-2 gap-4">
        <Stat label="Platform" value={d ? `${d.platform} · ${d.arch}` : '…'} />
        <Stat label="CPU cores" value={d ? String(d.cpuCount) : '…'} />
        <Stat label="OS uptime" value={d ? `${Math.floor(d.uptime / 3600)}h` : '…'} />
        <Stat label="Load (1m)" value={d ? d.loadAvg[0].toFixed(2) : '…'} />
      </div>
      <Card className="gap-0 p-4">
        <div className="mb-2 flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Memory</span>
          <span className="font-medium">
            {d ? `${formatBytes(d.totalMem - d.freeMem)} / ${formatBytes(d.totalMem)}` : '…'}
          </span>
        </div>
        <div className="h-2.5 overflow-hidden rounded-full bg-muted">
          <div className="h-full bg-brand transition-all duration-500" style={{ width: `${usedPct}%` }} />
        </div>
        <div className="mt-2 truncate text-xs text-muted-foreground">{d?.cpuModel}</div>
      </Card>
    </PageShell>
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
