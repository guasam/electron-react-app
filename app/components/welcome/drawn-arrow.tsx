// Scoped here so the welcome screen still deletes without leaving CSS behind. Two nudges to the
// right, then a long rest: the mark stays whole the entire time, so the motion points somewhere
// instead of drawing attention to itself. The second nudge carries less than the first, which is
// what keeps it from reading as a metronome.
const ARROW_CSS = `
  @keyframes welcome-arrow {
    0%, 58%, 100% { transform: translateX(0); }
    64%  { transform: translateX(4px); }
    71%  { transform: translateX(0); }
    77%  { transform: translateX(2.5px); }
    84%  { transform: translateX(0); }
  }
  .welcome-arrow-mark {
    animation: welcome-arrow 3.4s ease-in-out infinite;
  }
  @media (prefers-reduced-motion: reduce) {
    .welcome-arrow-mark { animation: none; }
  }
`

// A marker-drawn sweep with an open V for a head, both strokes tapering the way a real pen lifts.
// The source art sits inside a 500-square canvas; the viewBox below is cropped to the ink itself,
// measured off a render, so the mark fills its box instead of floating in empty space.
const ARROW_VIEWBOX = '120 184 260 132'
const ARROW_PATH =
  'M375.95 245.71c-6.18-13.07-22.21-14.92-33.93-21.16-29.11-11.27-58.17-22.62-86.21-36.42-5.15-2.8-4.05 4.74-2.59 7.39 4.87 15.91 21.97 19.24 35.18 25.8 13.69 6.2 27.69 11.61 41.74 16.9-12.73.12-25.61-1.49-38.19-2.47-51.09-6.41-102.94-16.8-149.65-39.09a155.28 155.28 0 0 1-16.43-9.9c-1.14-.84-3.46-2.34-4.55-.57-1.36 5.2 2.49 10.61 5.17 14.87 31.88 32.8 138.31 52.25 200.67 52.48-15.33 9.26-29.95 19.74-44.99 29.42-7.58 5.51-16.54 9.85-22.69 17.01-1.71 5.34 2.93 11.98 7.44 14.55.99.34 1.72-.37 2.07-1.24 34.84-20.49 69.03-43.91 107.85-56.22 4.63-1.49.47-8.42-.89-11.37Z'

/** A hand-drawn arrow mark that wipes itself in on a loop. */
export function DrawnArrow({ className }: { className?: string }) {
  return (
    <>
      <style>{ARROW_CSS}</style>
      {/* The shake rides on the svg, not the path: a transform on the path would be in viewBox
          units, so the nudge would scale with however large the mark is rendered. */}
      <svg viewBox={ARROW_VIEWBOX} aria-hidden className={`welcome-arrow-mark ${className ?? ''}`}>
        <path d={ARROW_PATH} fill="currentColor" />
      </svg>
    </>
  )
}
