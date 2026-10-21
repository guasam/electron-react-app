import { useEffect, useState, type ReactNode } from 'react'
import { Lightbulb } from 'lucide-react'
import { useWindowStore } from '@/app/shell/window-store'

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

/** Tips for getting the most out of the playground. Keep each to a single line at the panel's width. */
function getTips(isMac: boolean, onSelect: (id: string) => void): ReactNode[] {
  return [
    <>
      Press <Key>{isMac ? 'Option' : 'Alt'}</Key> to show or hide the menu bar.
    </>,
    <>
      Hit <Code>View code</Code> on any page to see the source behind it.
    </>,
    <>
      Open a second window from{' '}
      <button
        onClick={() => onSelect('store')}
        className="cursor-pointer text-brand underline-offset-2 hover:underline"
      >
        Shared state
      </button>{' '}
      and watch the store and ghost cursors sync.
    </>,
    <>
      Ready to build your own app? Run <Code>git switch main</Code>, then <Code>npm install</Code>.
    </>,
  ]
}

/** A rolling tip line for the Overview page. Pauses while hovered. */
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
      {/* Right padding keeps the dots clear of the floating "View code" button. */}
      <div className="flex items-center gap-3 py-3 pr-40 pl-10">
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
