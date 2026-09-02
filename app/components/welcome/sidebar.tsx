import { conveyor } from '@/conveyor/client'
import { cn } from '@/lib/utils'
import { DEMO_ID } from './demo-panel'
import { DrawnArrow } from './drawn-arrow'
import { STACK } from './stack'

const REPO = 'https://github.com/guasam/electron-react-app'

/** Stack navigation: one row per entry, with the live IPC badge and repo link pinned to the bottom. */
export function Sidebar({ active, onSelect }: { active: string; onSelect: (id: string) => void }) {
  return (
    <nav className="flex w-59 flex-none flex-col border-r border-border bg-card pt-5 pb-3.5">
      <div className="px-4.5 pb-4.5">
        <div className="text-[15px] font-bold tracking-[-0.02em]">Electron React App</div>
        <div className="mt-0.5 font-mono text-[10.5px] tracking-[0.06em] text-muted-foreground/70 uppercase">
          the stack
        </div>
      </div>

      <div className="flex flex-col gap-px px-2">
        {STACK.map((entry, i) => {
          const isActive = active === entry.id
          return (
            <button
              key={entry.id}
              onClick={() => onSelect(entry.id)}
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
              {entry.label}
            </button>
          )
        })}
      </div>

      <div className="flex-1" />

      <button
        onClick={() => onSelect(DEMO_ID)}
        className={cn(
          'group mx-3.5 rounded-[9px] border px-3.25 py-3 text-left transition-colors',
          active === DEMO_ID
            ? 'border-brand/50 bg-brand-soft'
            : 'border-border bg-muted hover:border-brand/40 hover:bg-brand-soft/40'
        )}
      >
        <div className="flex items-center gap-2">
          <span className="relative flex size-1.5">
            <span className="absolute inline-flex size-full animate-ping rounded-full bg-brand opacity-60" />
            <span className="relative inline-flex size-1.5 rounded-full bg-brand" />
          </span>
          <span className="font-mono text-[10px] font-medium tracking-[0.04em] text-foreground/80">
            TRY THE DEMO BRANCH
          </span>
        </div>
        <div className="mt-1.5 flex items-center justify-between gap-2 font-mono text-[10px] leading-normal text-muted-foreground">
          every primitive, running
          {/* Negative margin lets the mark break the card's padding, so it reads as pointing out
              of the card rather than sitting politely inside it. */}
          <DrawnArrow className="-my-1 -mr-4 h-5 w-10 flex-none text-brand" />
        </div>
      </button>

      <div className="flex items-center justify-between px-4.5 pt-3 font-mono text-[10px] text-muted-foreground">
        <span>ready to build</span>
        <button onClick={() => conveyor.web.openUrl(REPO)} className="transition-colors hover:text-foreground">
          github ↗
        </button>
      </div>
    </nav>
  )
}
