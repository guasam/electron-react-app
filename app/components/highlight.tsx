import { Fragment, type ReactNode } from 'react'

// Tiny TS/JS highlighter: sticky-regex scan, no dependency. Colors tuned to the design spec
// (keyword violet, function sky, string green, number amber), theme-aware for light + dark.
const RULES: [RegExp, string][] = [
  [/\/\/[^\n]*/y, 'text-muted-foreground/70 italic'],
  [/`[^`]*`|'[^']*'|"[^"]*"/y, 'text-green-700 dark:text-green-400'],
  [
    /\b(?:const|let|var|function|return|await|async|for|of|in|if|else|import|export|from|new|throw|type|interface|extends|as|void|yield|class)\b/y,
    'text-violet-700 dark:text-violet-300',
  ],
  [/\b[A-Za-z_$][\w$]*(?=\s*\()/y, 'text-sky-700 dark:text-sky-300'],
  [/\b\d[\d_]*\b/y, 'text-amber-700 dark:text-amber-300'],
]

/** Highlight a single line of TS/JS into colored spans. */
export function highlightLine(code: string): ReactNode[] {
  const nodes: ReactNode[] = []
  let plain = ''
  let i = 0
  let key = 0
  const flush = () => {
    if (plain) {
      nodes.push(<Fragment key={key++}>{plain}</Fragment>)
      plain = ''
    }
  }
  while (i < code.length) {
    let matched = false
    for (const [re, cls] of RULES) {
      re.lastIndex = i
      const m = re.exec(code)
      if (m) {
        flush()
        nodes.push(
          <span key={key++} className={cls}>
            {m[0]}
          </span>
        )
        i += m[0].length
        matched = true
        break
      }
    }
    if (!matched) {
      plain += code[i]
      i++
    }
  }
  flush()
  return nodes
}
