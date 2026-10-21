import { cn } from '@/lib/utils'
import { PAGES } from '../registry'

export function Sidebar({ active, onSelect }: { active: string; onSelect: (id: string) => void }) {
  return (
    <nav className="flex w-59 flex-none flex-col border-r border-border bg-card pt-5 pb-3.5">
      <div className="flex flex-col gap-px px-2">
        {PAGES.map((page) => {
          const isActive = active === page.id
          const Icon = page.icon
          return (
            <button
              key={page.id}
              onClick={() => onSelect(page.id)}
              className={cn(
                'flex items-center gap-2.75 rounded-[7px] px-2.5 py-2.25 text-[14px] transition-colors',
                isActive
                  ? 'bg-brand-soft text-foreground'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground cursor-pointer'
              )}
            >
              <Icon className={cn('size-3.5 flex-none', isActive ? 'text-brand' : 'text-muted-foreground/50')} />
              {page.label}
            </button>
          )
        })}
      </div>
    </nav>
  )
}
