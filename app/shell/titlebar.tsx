import { useEffect, type ReactNode } from 'react'
import { Minus, Square, Copy, X, Sun, Moon } from 'lucide-react'
import { conveyor } from '@/conveyor/client'
import { cn } from '@/lib/utils'
import { useWindowStore } from './window-store'
import { useThemeStore } from './theme-store'
import { TitlebarMenu } from './titlebar-menu'

/**
 * Custom window titlebar: core shell chrome, styled with Tailwind on the theme tokens (no legacy
 * window.css). A conveyor consumer itself: the menu + controls call the window/web modules. macOS
 * keeps its native inset traffic lights; win32/linux render these controls.
 */
export function Titlebar({ title = 'Electron React App' }: { title?: string }) {
  const platform = useWindowStore((s) => s.platform)
  const menuVisible = useWindowStore((s) => s.menuVisible)
  const toggleMenu = useWindowStore((s) => s.toggleMenu)
  const isMac = platform === 'darwin'

  // Alt shows/hides the menu bar, like a normal Electron window.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Alt' && !e.repeat) {
        e.preventDefault()
        toggleMenu()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [toggleMenu])

  return (
    <header
      className={cn(
        'relative flex h-10 shrink-0 items-center border-b border-border bg-card select-none [-webkit-app-region:drag]',
        isMac && 'pl-20'
      )}
    >
      <div className="flex items-center gap-2.5 pl-3 [-webkit-app-region:no-drag]">
        {/* The native traffic lights already anchor the left edge on macOS, where a same-sized dot
            beside them just reads as a fourth window control. */}
        {!isMac && <span className="size-3.25 rounded-lg bg-brand ring-[3px] ring-brand/20" />}
        {menuVisible && <TitlebarMenu />}
      </div>

      {/* Centered title. pointer-events-none so the drag region shows through. */}
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
        <span className="text-[13px] font-medium text-foreground/60">{title}</span>
      </div>

      <div className="ml-auto flex items-center [-webkit-app-region:no-drag]">
        <ThemeToggle />
        {!isMac && <WindowControls />}
      </div>
    </header>
  )
}

function ThemeToggle() {
  const theme = useThemeStore((s) => s.theme)
  const toggle = useThemeStore((s) => s.toggle)
  const Icon = theme === 'dark' ? Sun : Moon
  return (
    <ControlButton label="Toggle theme" onClick={toggle}>
      <Icon className="size-4" />
    </ControlButton>
  )
}

function WindowControls() {
  const minimizable = useWindowStore((s) => s.minimizable)
  const maximizable = useWindowStore((s) => s.maximizable)
  const isMaximized = useWindowStore((s) => s.isMaximized)

  return (
    <div className="flex">
      {minimizable && (
        <ControlButton label="Minimize" onClick={() => conveyor.window.minimize()}>
          <Minus className="size-4" />
        </ControlButton>
      )}
      {maximizable && (
        <ControlButton label="Maximize" onClick={() => conveyor.window.maximizeToggle()}>
          {isMaximized ? <Copy className="size-3.5" /> : <Square className="size-3.5" />}
        </ControlButton>
      )}
      <ControlButton label="Close" onClick={() => conveyor.window.close()} destructive>
        <X className="size-4" />
      </ControlButton>
    </div>
  )
}

function ControlButton({
  children,
  label,
  onClick,
  destructive,
}: {
  children: ReactNode
  label: string
  onClick: () => void
  destructive?: boolean
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className={cn(
        'flex h-10 w-11 items-center justify-center text-foreground/60 transition-colors',
        destructive ? 'hover:bg-destructive hover:text-white' : 'hover:bg-accent hover:text-foreground'
      )}
    >
      {children}
    </button>
  )
}
