import { useState } from 'react'
import { conveyor } from '@/conveyor/client'
import { PAGES } from './registry'
import { Sidebar } from './components/sidebar'
import { Toaster, useToasts } from './components/toast'
import { Presence } from './components/presence'

/**
 * The playground: a sidebar and the capability page it selects.
 * This is the demo branch's app root; the clean shell to build on lives on `main`.
 */
export function Playground() {
  // A window opened with `windows.open(pageId)` carries the page in its URL hash (see lib/main/app.ts),
  // so a second window can land straight on the capability that opened it.
  const [active, setActive] = useState(() => {
    const requested = decodeURIComponent(window.location.hash.slice(1))
    return PAGES.some((p) => p.id === requested) ? requested : 'overview'
  })
  const Page = (PAGES.find((p) => p.id === active) ?? PAGES[0]).component

  // Any broadcast lands as a toast in every window, whatever page it's on.
  conveyor.notify.onNotify.useEvent((message) => useToasts.getState().show(message))

  return (
    <div className="flex h-full min-h-0">
      <Sidebar active={active} onSelect={setActive} />

      <div className="min-w-0 flex-1 overflow-auto">
        <Page onNavigate={setActive} />
      </div>

      <Toaster />
      <Presence page={active} />
    </div>
  )
}
