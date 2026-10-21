import { create } from 'zustand'

/** Live window state for the shell, fed by `window.init()` + the main→renderer push events. */
interface WindowState {
  platform: string
  minimizable: boolean
  maximizable: boolean
  isFocused: boolean
  isMaximized: boolean
  /** Whether the titlebar menu bar (File/Edit/View) is shown. Alt toggles it, like a normal window. */
  menuVisible: boolean
  setInit: (init: { platform: string; minimizable: boolean; maximizable: boolean }) => void
  setFocused: (focused: boolean) => void
  setMaximized: (maximized: boolean) => void
  toggleMenu: () => void
}

export const useWindowStore = create<WindowState>((set) => ({
  platform: '',
  minimizable: true,
  maximizable: true,
  isFocused: true,
  isMaximized: false,
  menuVisible: false,
  setInit: (init) => set(init),
  setFocused: (isFocused) => set({ isFocused }),
  setMaximized: (isMaximized) => set({ isMaximized }),
  toggleMenu: () => set((s) => ({ menuVisible: !s.menuVisible })),
}))
