import type { ReactNode } from 'react'

/** Consistent header + body layout for every playground page. */
export function PageShell({
  title,
  description,
  children,
}: {
  title: string
  description: string
  children: ReactNode
}) {
  return (
    <div className="mx-auto max-w-3xl px-8 py-10">
      <div className="mb-7">
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{description}</p>
      </div>
      <div className="space-y-5">{children}</div>
    </div>
  )
}
