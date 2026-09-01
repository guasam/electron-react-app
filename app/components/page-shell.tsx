import type { ReactNode } from 'react'

/** Consistent header + body layout for every playground page. */
export function PageShell({
  badge,
  title,
  description,
  children,
}: {
  badge: string
  title: string
  description: string
  children: ReactNode
}) {
  return (
    <div className="mx-auto max-w-3xl px-8 py-10">
      <div className="mb-7">
        <span className="inline-block rounded-full border border-border bg-muted/50 px-2.5 py-0.5 font-mono text-[11px] text-muted-foreground">
          {badge}
        </span>
        <h1 className="mt-3 text-2xl font-semibold tracking-tight">{title}</h1>
        <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{description}</p>
      </div>
      <div className="space-y-5">{children}</div>
    </div>
  )
}
