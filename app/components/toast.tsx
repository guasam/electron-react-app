import { create } from 'zustand'
import { X } from 'lucide-react'

interface Toast {
  id: number
  message: string
}

interface ToastState {
  toasts: Toast[]
  show: (message: string) => void
  dismiss: (id: number) => void
}

let seq = 0

/** Minimal toast store. Call `useToasts.getState().show(msg)` or the `show` action from a hook. */
export const useToasts = create<ToastState>((set) => ({
  toasts: [],
  show: (message) => {
    const id = ++seq
    set((s) => ({ toasts: [...s.toasts, { id, message }] }))
    setTimeout(() => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })), 3500)
  },
  dismiss: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}))

/** Fixed bottom-right toast stack. Render once, high in the tree. */
export function Toaster() {
  const toasts = useToasts((s) => s.toasts)
  const dismiss = useToasts((s) => s.dismiss)

  return (
    <div className="pointer-events-none fixed bottom-5 left-1/2 z-50 flex -translate-x-1/2 flex-col items-center gap-2">
      {toasts.map((t) => (
        <div
          key={t.id}
          className="animate-in slide-in-from-bottom-2 fade-in pointer-events-auto flex items-center gap-3 rounded-lg border border-brand/60 bg-popover px-4 py-2.5 text-sm text-popover-foreground shadow-lg"
        >
          <span>{t.message}</span>
          <button
            onClick={() => dismiss(t.id)}
            className="text-muted-foreground transition-colors hover:text-foreground"
          >
            <X className="size-3.5" />
          </button>
        </div>
      ))}
    </div>
  )
}
