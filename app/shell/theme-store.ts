import { flushSync } from 'react-dom'
import { create } from 'zustand'

export type Theme = 'light' | 'dark'

const STORAGE_KEY = 'era-theme'

function initialTheme(): Theme {
  const saved = typeof localStorage !== 'undefined' ? localStorage.getItem(STORAGE_KEY) : null
  if (saved === 'light' || saved === 'dark') return saved
  // No saved preference → follow the OS, defaulting to dark.
  return typeof matchMedia !== 'undefined' && matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark'
}

/**
 * Cross-fades the window across a theme change instead of snapping every colour at once.
 *
 * The class that carries the theme is applied in a layout effect, so the update has to be flushed
 * synchronously for the transition to capture both the before and after frames. Skipped entirely
 * when the API is missing or motion is turned down, which simply restores the instant swap.
 *
 * `theme-switching` suppresses element-level transitions for the duration. Anything carrying
 * `transition-colors` would otherwise start its own animation as the tokens change, and the
 * after-frame gets snapshotted before that finishes — leaving those elements a step behind the
 * page around them, which reads as a flash rather than a fade.
 */
function withTransition(apply: () => void): void {
  const root = document.documentElement
  root.classList.add('theme-switching')
  const settle = () => root.classList.remove('theme-switching')

  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches
  if (reduced || !document.startViewTransition) {
    apply()
    requestAnimationFrame(settle)
    return
  }
  document.startViewTransition(() => flushSync(apply)).finished.finally(settle)
}

interface ThemeState {
  theme: Theme
  setTheme: (theme: Theme) => void
  toggle: () => void
}

/** Light/dark theme, persisted to localStorage. WindowFrame applies it as a `.dark` class on <html>. */
export const useThemeStore = create<ThemeState>((set, get) => ({
  theme: initialTheme(),
  setTheme: (theme) => {
    localStorage.setItem(STORAGE_KEY, theme)
    withTransition(() => set({ theme }))
  },
  toggle: () => get().setTheme(get().theme === 'dark' ? 'light' : 'dark'),
}))
