import { formatBytes } from './format'

export interface TreemapItem {
  name: string
  bytes: number
  dir: boolean
}

interface Tile extends TreemapItem {
  x: number
  y: number
  w: number
  h: number
  share: number
}

// Layout space: the container is rendered at this aspect ratio (see the aspect class below), so
// squarified tiles come out actually near-square on screen.
const W = 100
const H = 62.5
const MAX_TILES = 20

/**
 * Squarified treemap (Bruls et al.) of a size breakdown. Items beyond the biggest MAX_TILES, and
 * anything too small to see, are folded into one "(everything else)" tile.
 */
export function Treemap({ items }: { items: TreemapItem[] }) {
  const total = items.reduce((sum, i) => sum + i.bytes, 0)
  if (total === 0) return null

  const visible = items.filter((i) => i.bytes / total >= 0.003).slice(0, MAX_TILES)
  const restBytes = total - visible.reduce((sum, i) => sum + i.bytes, 0)
  if (restBytes > 0) visible.push({ name: '(everything else)', bytes: restBytes, dir: false })

  const tiles = layout(visible, total)

  return (
    <div className="relative aspect-[16/10] w-full overflow-hidden rounded-lg">
      {tiles.map((t) => (
        <div
          key={t.name}
          title={`${t.name} · ${formatBytes(t.bytes)} · ${(t.share * 100).toFixed(1)}%`}
          className="absolute overflow-hidden rounded-[3px] border border-background p-1"
          style={{
            left: `${(t.x / W) * 100}%`,
            top: `${(t.y / H) * 100}%`,
            width: `${(t.w / W) * 100}%`,
            height: `${(t.h / H) * 100}%`,
            // Share-weighted brand tint: the big offenders glow, the long tail fades into the card.
            backgroundColor: t.dir
              ? `color-mix(in srgb, var(--brand) ${Math.round(18 + t.share * 110)}%, var(--card))`
              : `color-mix(in srgb, var(--muted-foreground) ${Math.round(12 + t.share * 40)}%, var(--card))`,
          }}
        >
          {t.share > 0.015 && t.w > 7 && t.h > 5 && (
            <div className="min-w-0">
              <div className="truncate text-[10.5px] leading-tight font-medium">{t.name}</div>
              <div className="truncate font-mono text-[9.5px] text-foreground/60">{formatBytes(t.bytes)}</div>
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

/** Squarify: build rows along the shorter side, flushing when adding an item would worsen aspect. */
function layout(items: TreemapItem[], total: number): Tile[] {
  const scale = (W * H) / total
  let queue = items.map((item) => ({ item, area: item.bytes * scale })).filter((c) => c.area > 0)
  const out: Tile[] = []
  let rect = { x: 0, y: 0, w: W, h: H }
  let row: typeof queue = []

  while (queue.length) {
    const side = Math.min(rect.w, rect.h)
    if (row.length === 0 || worst([...row, queue[0]], side) <= worst(row, side)) {
      row.push(queue[0])
      queue = queue.slice(1)
    } else {
      rect = flushRow(row, rect, total, out)
      row = []
    }
  }
  if (row.length) flushRow(row, rect, total, out)
  return out
}

/** Worst aspect ratio a row would have if laid along a side of the given length. */
function worst(row: { area: number }[], side: number): number {
  const total = row.reduce((sum, c) => sum + c.area, 0)
  const max = Math.max(...row.map((c) => c.area))
  const min = Math.min(...row.map((c) => c.area))
  return Math.max((side * side * max) / (total * total), (total * total) / (side * side * min))
}

function flushRow(
  row: { item: TreemapItem; area: number }[],
  rect: { x: number; y: number; w: number; h: number },
  grandTotal: number,
  out: Tile[]
) {
  const area = row.reduce((sum, c) => sum + c.area, 0)
  if (rect.w >= rect.h) {
    // Vertical strip on the left edge, tiles stacked top to bottom.
    const stripW = area / rect.h
    let y = rect.y
    for (const c of row) {
      const h = c.area / stripW
      out.push({ ...c.item, x: rect.x, y, w: stripW, h, share: c.item.bytes / grandTotal })
      y += h
    }
    return { x: rect.x + stripW, y: rect.y, w: rect.w - stripW, h: rect.h }
  }
  // Horizontal strip on the top edge, tiles laid left to right.
  const stripH = area / rect.w
  let x = rect.x
  for (const c of row) {
    const w = c.area / stripH
    out.push({ ...c.item, x, y: rect.y, w, h: stripH, share: c.item.bytes / grandTotal })
    x += w
  }
  return { x: rect.x, y: rect.y + stripH, w: rect.w, h: rect.h - stripH }
}
