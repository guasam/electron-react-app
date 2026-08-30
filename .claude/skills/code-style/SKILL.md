---
name: code-style
description: The house code style for this repo — section banner format, comment tone and density, doc-comment rules, and implementation-shape preferences. Consult this whenever writing, editing, refactoring, or reviewing TypeScript/TSX source here — new modules, bug fixes, type work, review follow-ups — even when the task says nothing about style or comments.
---

# Code style

House rules for how source in this repo should read. Prettier and ESLint own formatting
(quotes, semicolons, line width, import order) — never hand-enforce or restate those. This
skill covers the judgment calls tooling can't make.

## Section banners

When a file has several distinct groups of declarations, head each group with exactly this
banner shape (dash lines run to column 60):

```ts
/* ----------------------------------------------------------
 * Middleware
 * ----------------------------------------------------------
 */
```

A group that needs one line of justification carries it inside the banner, under the title:

```ts
/* ----------------------------------------------------------
 * Def guards
 * Named tests for "which kind of def is this" — `any` params
 * dodge resolver contravariance.
 * ----------------------------------------------------------
 */
```

- The title is a short noun phrase, nothing appended.
- Only use banners when a file actually has 3+ groups; a short single-purpose file needs none.
- Never the single-line form `/* -- Title ------- */` — that's the old convention, replace it
  on sight when already editing the file.

## Comments

A comment earns its place only by carrying something the code cannot: a constraint, a reason,
a trade-off, a trap for the next editor. If it restates what the adjacent code does, delete it.

- Not verbose — detailed enough that a reader knows *when this matters*, and no more. One or
  two lines is the norm; a paragraph means the code probably needs restructuring instead.
- **Doc comments** (`/** … */`) on every exported symbol. First line: what it's *for*, one
  sentence. Add further lines only for behavior the signature can't reveal (validation
  timing, lifecycle, what happens on failure).
- **Inline comments** state rationale, never narration.
  - Good: `// sendSync is fine here: called once at startup, then cached`
  - Bad: `// increment the counter`
- A non-obvious constraint gets explained **once, where it's defined** (e.g. at a type guard),
  not re-explained at every use site.
- Never write changelog-style comments (what changed, why the change is correct, who asked) —
  that's for the commit message.

## Implementations

- Match the surrounding file's idiom, naming, and density before your own preferences.
- Prefer small named pieces over inline cleverness: a nested conditional type becomes named
  guards + extractors + a kind-indexed table; a dense expression becomes a named helper. If a
  construct needs a comment to be readable, first try making it not need one.
- Keep pure logic separate from platform edges (in these repos: dispatch/types are pure,
  electron/react wiring lives at the entry layers) — pure code is the testable code.
- Validation and trust rules follow "no schema, no input": anything crossing the IPC boundary
  from the renderer is validated; comments at the boundary say which side is trusted.
