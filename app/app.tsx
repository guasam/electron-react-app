import { WindowFrame } from './shell'
import { Welcome } from './components/welcome'
import './styles/app.css'
import { useState } from 'react'
import { SettingsPage } from './features/settings/settings-page'
import { Button } from './components/ui/button'

/**
 * Application views. Settings is the removable business example; Welcome is the independent stack tour.
 */
export default function App() {
  const [tour, setTour] = useState(false)
  return (
    <WindowFrame title="Electron Business Starter">
      <div className="flex h-full flex-col">
        <nav aria-label="Application views" className="flex gap-2 border-b border-border px-6 py-2">
          <Button variant={tour ? 'ghost' : 'secondary'} size="sm" onClick={() => setTour(false)}>
            Settings
          </Button>
          <Button variant={tour ? 'secondary' : 'ghost'} size="sm" onClick={() => setTour(true)}>
            Stack tour
          </Button>
        </nav>
        <div className="min-h-0 flex-1">{tour ? <Welcome /> : <SettingsPage />}</div>
      </div>
    </WindowFrame>
  )
}
