import { useEffect, useState } from 'react'
import { Lock, LockOpen, KeyRound } from 'lucide-react'
import { ConveyorError } from 'electron-conveyor/react'
import { conveyor } from '@/conveyor/client'
import { Button } from '../components/button'
import { Input } from '@/app/components/ui/input'
import { Card } from '@/app/components/ui/card'
import { PageShell } from '../components/page-shell'

export function SecurePage() {
  const [pin, setPin] = useState('')
  const [unlocked, setUnlocked] = useState(false)
  const [secret, setSecret] = useState<{ secret: string; uptimeMs: number } | null>(null)
  const [error, setError] = useState<string | null>(null)

  const refresh = async () => setUnlocked((await conveyor.secure.status()).unlocked)
  useEffect(() => {
    refresh()
  }, [])

  const unlock = async () => {
    setError(null)
    await conveyor.secure.unlock(pin)
    setPin('')
    refresh()
  }
  const lock = async () => {
    await conveyor.secure.lock()
    setSecret(null)
    refresh()
  }
  const read = async () => {
    setError(null)
    try {
      setSecret(await conveyor.secure.readSecret())
    } catch (e) {
      setSecret(null)
      // Errors keep their code across the IPC boundary — branch on it, not on message strings.
      if (e instanceof ConveyorError && e.code === 'LOCKED') setError(e.message)
      else setError(e instanceof Error ? e.message : String(e))
    }
  }

  return (
    <PageShell
      badge="Middleware + Context · query.use()"
      title="A guarded procedure"
      description="readSecret is built on a guarded base (query.use(requireUnlocked)) and reads the app context. Read it locked (it throws a typed LOCKED error), unlock with 1234, read again."
    >
      <Card className="gap-0 p-4">
        <div className="flex items-center gap-2">
          <div
            className={`flex size-9 items-center justify-center rounded-lg ${unlocked ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'}`}
          >
            {unlocked ? <LockOpen className="size-4" /> : <Lock className="size-4" />}
          </div>
          <span className="text-sm font-medium">{unlocked ? 'Unlocked' : 'Locked'}</span>
          <div className="flex-1" />
          {unlocked ? (
            <Button variant="secondary" onClick={lock}>
              Lock
            </Button>
          ) : (
            <>
              <Input
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && unlock()}
                placeholder="PIN 1234"
                className="w-28"
              />
              <Button onClick={unlock}>
                <KeyRound className="size-4" /> Unlock
              </Button>
            </>
          )}
        </div>

        <div className="mt-4 flex items-center gap-3">
          <Button variant="outline" onClick={read}>
            Read secret
          </Button>
          {secret && (
            <span className="text-sm">
              {secret.secret} <span className="text-muted-foreground">· served {secret.uptimeMs}ms after boot</span>
            </span>
          )}
          {error && <span className="text-sm text-destructive">{error}</span>}
        </div>
      </Card>
    </PageShell>
  )
}
