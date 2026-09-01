import { useState } from 'react'
import { Check, Copy, Terminal } from 'lucide-react'
import { WindowFrame } from './shell'
import { Card } from './components/ui/card'
import { Button } from './components/ui/button'
import './styles/app.css'

const DEMO_COMMANDS = ['git switch demo', 'npm install', 'npm run dev']

/** Placeholder root: replace this with your app. The demo pointer below is safe to delete. */
export default function App() {
  return (
    <WindowFrame title="Electron React App">
      <div className="flex h-full flex-col items-center justify-center gap-8 px-6">
        <div className="text-center">
          <h1 className="text-2xl font-semibold tracking-tight">Your app starts here</h1>
          <p className="mt-2 max-w-[44ch] text-sm text-pretty text-muted-foreground">
            A minimal shell: window frame, titlebar, menu, and typed IPC via electron-conveyor. Build on top of it.
          </p>
        </div>

        <Card className="w-full max-w-sm gap-3 p-4">
          <div className="flex items-center gap-2 text-sm font-medium">
            <Terminal className="size-4 text-muted-foreground" />
            Want to see what this stack can do?
          </div>
          <p className="text-xs text-muted-foreground">
            The <span className="font-mono text-foreground/80">demo</span> branch is a full playground of live examples
            (cross-window state, streaming, background tasks):
          </p>
          <CommandBlock commands={DEMO_COMMANDS} />
        </Card>
      </div>
    </WindowFrame>
  )
}

/** Mono command list with a one-click copy of all lines. */
function CommandBlock({ commands }: { commands: string[] }) {
  const [copied, setCopied] = useState(false)

  const copy = async () => {
    await navigator.clipboard.writeText(commands.join('\n'))
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  return (
    <div className="relative rounded-lg bg-muted/40 p-3">
      <pre className="font-mono text-xs leading-6 text-foreground/90">{commands.join('\n')}</pre>
      <Button
        variant="ghost"
        size="icon"
        className="absolute top-1.5 right-1.5 size-7"
        onClick={copy}
        aria-label="Copy commands"
      >
        {copied ? <Check className="size-3.5 text-success" /> : <Copy className="size-3.5" />}
      </Button>
    </div>
  )
}
