import { conveyor } from '@/conveyor/client'
import { cn } from '@/lib/utils'
import { PAGES } from '../registry'

export function Sidebar({ active, onSelect }: { active: string; onSelect: (id: string) => void }) {
  const version = conveyor.system.info.useQuery().data?.version

  return (
    <nav className="flex w-59 flex-none flex-col border-r border-border bg-card pt-5 pb-3.5">
      <div className="px-4.5 pb-4.5">
        <div className="text-[15px] font-bold tracking-[-0.02em]">Conveyor</div>
        <div className="mt-0.5 font-mono text-[10.5px] tracking-[0.06em] text-muted-foreground/70 uppercase">
          playground
        </div>
      </div>

      <div className="flex flex-col gap-px px-2">
        {PAGES.map((p, i) => {
          const isActive = active === p.id
          return (
            <button
              key={p.id}
              onClick={() => onSelect(p.id)}
              className={cn(
                'relative flex items-center gap-2.75 rounded-[7px] px-2.5 py-2.25 text-[14px] transition-colors',
                isActive
                  ? 'bg-brand-soft text-foreground'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              )}
            >
              {isActive && <span className="absolute top-2.25 bottom-2.25 left-0 w-0.5 rounded-full bg-brand" />}
              <span
                className={cn(
                  'w-3.5 flex-none font-mono text-[9.5px] font-medium',
                  isActive ? 'text-brand' : 'text-muted-foreground/50'
                )}
              >
                {String(i).padStart(2, '0')}
              </span>
              {p.label}
            </button>
          )
        })}
      </div>

      <div className="flex-1" />

      <div className="mx-3.5 rounded-[9px] border border-border bg-muted px-3.25 py-3">
        <div className="flex items-center gap-2">
          <span className="relative flex size-1.5">
            <span className="absolute inline-flex size-full animate-ping rounded-full bg-success opacity-60" />
            <span className="relative inline-flex size-1.5 rounded-full bg-success" />
          </span>
          <span className="font-mono text-[10px] font-medium tracking-[0.04em] text-foreground/80">
            IPC BRIDGE LIVE
          </span>
        </div>
        <div className="mt-1.5 font-mono text-[10px] leading-normal text-muted-foreground">main ↔ renderer, typed</div>
      </div>

      <div className="flex items-center justify-between px-4.5 pt-3 font-mono text-[10px] text-muted-foreground">
        <span>v{version ?? '...'}</span>
        <button
          onClick={() => conveyor.web.openUrl('https://github.com/guasam/electron-react-app')}
          className="transition-colors hover:text-foreground"
        >
          github ↗
        </button>
      </div>
    </nav>
  )
}
