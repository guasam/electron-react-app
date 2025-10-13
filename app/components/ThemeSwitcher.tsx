import { useEffect, useState } from 'react'
import { Moon, Sun } from 'lucide-react'

export function ThemeSwitcher() {
  const [isDarkMode, setIsDarkMode] = useState(false)

  useEffect(() => {
    // Check initial theme on mount
    setIsDarkMode(document.documentElement.classList.contains('dark'))
  }, [])

  const toggleTheme = () => {
    document.documentElement.classList.toggle('dark')
    setIsDarkMode(!isDarkMode)
  }

  return (
    <button
      onClick={toggleTheme}
      aria-label={isDarkMode ? 'Switch to light mode' : 'Switch to dark mode'}
      className="flex h-8 w-8 items-center justify-center rounded-md border border-border bg-transparent text-muted-foreground transition-all hover:border-foreground hover:text-foreground"
    >
      {isDarkMode ? (
        <Sun className="h-4 w-4 transition-transform" />
      ) : (
        <Moon className="h-4 w-4 transition-transform" />
      )}
    </button>
  )
}
