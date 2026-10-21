import { conveyor } from '@/conveyor/client'
import { cn } from '@/lib/utils'
import { STACK } from './stack'

/** Stack navigation: one row per entry, under the app name and version. */
export function Sidebar({ active, onSelect }: { active: string; onSelect: (id: string) => void }) {
  const { data: version } = conveyor.app.version.useQuery()

  return (
    <nav className="flex w-59 flex-none flex-col border-r border-border bg-card pt-5 pb-3.5">
      <div className="px-4.5 pb-4.5">
        <div className="text-[15px] font-bold tracking-[-0.02em]">Electron React App</div>
        <div className="mt-0.5 font-mono text-[10.5px] tracking-[0.06em] text-muted-foreground/70 uppercase">
          {version && `v${version}`}
        </div>
      </div>

      <div className="flex flex-col gap-px px-2">
        {STACK.map((entry) => {
          const isActive = active === entry.id
          const Icon = entry.icon
          return (
            <button
              key={entry.id}
              onClick={() => onSelect(entry.id)}
              className={cn(
                'relative flex items-center gap-2.75 rounded-[7px] px-2.5 py-2.25 text-[14px] transition-colors',
                isActive
                  ? 'bg-brand-soft text-foreground'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground cursor-pointer'
              )}
            >
              {isActive && <span className="absolute top-2.25 bottom-2.25 left-0 w-0.5 rounded-full bg-brand" />}
              <Icon className={cn('size-3.5 flex-none', isActive ? 'text-brand' : 'text-muted-foreground/50')} />
              {entry.label}
            </button>
          )
        })}
      </div>
    </nav>
  )
}
