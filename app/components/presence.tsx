import { useEffect } from 'react'
import { MousePointer2 } from 'lucide-react'
import { useConveyorStore, useConveyorActions } from 'electron-conveyor/react'
import { conveyor } from '@/conveyor/client'
import { presenceStore } from '@/conveyor/stores/presence'

/**
 * Cross-window ghost cursors: publishes this window's pointer into the presence store and renders
 * every other window's pointer as a live colored ghost. Coordinates are viewport-normalized, so a
 * ghost lands at the same proportional spot whatever size each window is.
 */
export function Presence({ page }: { page: string }) {
  const selfId = conveyor.windows.id.useQuery().data ?? null
  const { move, leave } = useConveyorActions(presenceStore)
  const cursors = useConveyorStore(presenceStore, (s) => s.cursors)

  useEffect(() => {
    if (selfId === null) return

    // rAF-gated publish: one store dispatch per frame at most, always with the LATEST coordinates
    // (naively dispatching inside rAF would replay the first event of the frame, not the last).
    let frame = 0
    let last: MouseEvent | null = null
    const onMove = (e: MouseEvent) => {
      last = e
      if (frame) return
      frame = requestAnimationFrame(() => {
        frame = 0
        if (!last) return
        move({
          id: selfId,
          x: Math.min(1, Math.max(0, last.clientX / window.innerWidth)),
          y: Math.min(1, Math.max(0, last.clientY / window.innerHeight)),
          page,
        })
      })
    }
    // Only mouseleave retires the ghost — not blur. An unfocused window still tracks hover, and
    // removing on blur would erase the ghost the moment you click into the other window.
    const onLeave = () => leave(selfId)

    window.addEventListener('mousemove', onMove)
    document.documentElement.addEventListener('mouseleave', onLeave)
    return () => {
      cancelAnimationFrame(frame)
      window.removeEventListener('mousemove', onMove)
      document.documentElement.removeEventListener('mouseleave', onLeave)
    }
  }, [selfId, page, move, leave])

  if (selfId === null) return null

  return (
    <>
      {Object.entries(cursors)
        .filter(([id]) => Number(id) !== selfId)
        .map(([id, c]) => {
          const color = `hsl(${c.hue} 70% 52%)`
          return (
            <div
              key={id}
              className="pointer-events-none fixed top-0 left-0 z-50 transition-transform duration-100 ease-linear"
              style={{ transform: `translate(${c.x * 100}vw, ${c.y * 100}vh)` }}
            >
              <MousePointer2 className="size-4 drop-shadow-sm" style={{ color, fill: color }} />
              <span
                className="absolute top-4 left-3 rounded-md px-1.5 py-0.5 text-[10px] font-medium whitespace-nowrap text-white"
                style={{ backgroundColor: color }}
              >
                Window {id}
                {c.page !== page && ` · ${c.page}`}
              </span>
            </div>
          )
        })}
    </>
  )
}
