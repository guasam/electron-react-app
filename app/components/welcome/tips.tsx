import { useEffect, useState, type ReactNode } from 'react'
import { Lightbulb } from 'lucide-react'
import { useWindowStore } from '@/app/shell/window-store'
import { DEMO_ID } from './demo-panel'

/** How long each tip stays up before the next one rolls in. */
const TIP_INTERVAL_MS = 6000

function Key({ children }: { children: ReactNode }) {
  return (
    <kbd className="rounded border border-border bg-muted px-1.5 py-px font-mono text-[11.5px] text-foreground/80">
      {children}
    </kbd>
  )
}

function Code({ children }: { children: ReactNode }) {
  return <span className="font-mono text-[12.5px] text-foreground/80">{children}</span>
}

/** Tips worth knowing on day one. Keep each to a single line at the panel's width. */
function getTips(isMac: boolean, onSelect: (id: string) => void): ReactNode[] {
  return [
    <>
      Switch to the{' '}
      <button
        onClick={() => onSelect(DEMO_ID)}
        className="cursor-pointer text-brand underline-offset-2 hover:underline"
      >
        demo
      </button>{' '}
      branch to try every primitive conveyor provides.
    </>,
    <>
      Press <Key>{isMac ? 'Option' : 'Alt'}</Key> to show or hide the menu bar.
    </>,
    <>
      The View menu has <Code>Toggle DevTools</Code>, and zoom controls for the whole window.
    </>,
    <>The light and dark toggle sits at the right of the titlebar, and the choice sticks.</>,
    <>
      Add your own IPC in <Code>conveyor/modules</Code>, then register it in <Code>router.ts</Code>.
    </>,
  ]
}

/** A rolling tip line for the landing panel. Pauses while hovered, and holds still for reduced motion. */
export function TipTicker({ onSelect }: { onSelect: (id: string) => void }) {
  const isMac = useWindowStore((s) => s.platform === 'darwin')
  const [index, setIndex] = useState(0)
  const [paused, setPaused] = useState(false)

  const tips = getTips(isMac, onSelect)

  useEffect(() => {
    if (paused) return
    const timer = setInterval(() => setIndex((i) => (i + 1) % tips.length), TIP_INTERVAL_MS)
    return () => clearInterval(timer)
  }, [paused, tips.length])

  return (
    <div
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      // Pinned to the bottom of the scroll pane, so it stays in view however short the window is.
      className="sticky bottom-0 border-t border-border bg-card"
    >
      <div className="mx-auto flex max-w-3xl items-center gap-3 px-8 py-3">
        <Lightbulb className="size-4 flex-none text-brand" />
        <div className="relative min-h-5 min-w-0 flex-1 overflow-hidden text-[13.5px] leading-5 text-muted-foreground">
          {/* Keyed so each tip remounts and plays the entrance again. */}
          <p key={index} className="animate-in fade-in slide-in-from-bottom-1 duration-300 motion-reduce:animate-none">
            {tips[index]}
          </p>
        </div>
        <div className="flex flex-none gap-1">
          {tips.map((_, i) => (
            <button
              key={i}
              aria-label={`Show tip ${i + 1}`}
              onClick={() => setIndex(i)}
              className={`size-1.5 rounded-full transition-colors ${i === index ? 'bg-brand' : 'bg-muted-foreground/25 hover:bg-muted-foreground/50'}`}
            />
          ))}
        </div>
      </div>
    </div>
  )
}
