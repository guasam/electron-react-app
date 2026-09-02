import { useState } from 'react'
import { Sidebar } from './sidebar'
import { Hero } from './hero'
import { Panel } from './panel'
import { DemoPanel } from './demo-panel'
import { STACK } from './stack'

/**
 * The welcome screen — a short tour of what this starter kit is built on.
 *
 * Nothing else in the app imports from this folder, so deleting `app/components/welcome` and the
 * `<Welcome />` line in `app.tsx` leaves the bare shell behind, with nothing to clean up after.
 */
export function Welcome() {
  const [active, setActive] = useState(STACK[0].id)
  // The demo pitch is not a stack entry, so it is the one id that resolves to nothing here.
  const entry = STACK.find((e) => e.id === active)

  return (
    <div className="flex h-full min-h-0">
      <Sidebar active={active} onSelect={setActive} />
      <div className="min-w-0 flex-1 overflow-auto">
        {!entry ? <DemoPanel /> : entry.hero ? <Hero entry={entry} onSelect={setActive} /> : <Panel entry={entry} />}
      </div>
    </div>
  )
}
