# Electron React App

A modern Electron application template with React, Vite, TypeScript, and TailwindCSS — built
around **[electron-conveyor](https://github.com/guasam/electron-conveyor)** for type-safe IPC and
cross-window state.

<br />

![Electron](https://img.shields.io/badge/v40.1.0-Electron-blue) &nbsp;
![React](https://img.shields.io/badge/v19.2.4-React-blue) &nbsp;
![TypeScript](https://img.shields.io/badge/v5.9.3-TypeScript-blue) &nbsp;
![Vite](https://img.shields.io/badge/v7.3.1-Vite-blue) &nbsp;
![Shadcn](https://img.shields.io/badge/Shadcn-UI-blue) &nbsp;
![Tailwind](https://img.shields.io/badge/v4.1.18-Tailwind-blue)

<br />

<p align="center">
    <img src="app/assets/era-preview.png" target="_blank" />
</p>

<p align="center">
    <a href="https://imgur.com/B5pGkDk">Watch Video Preview</a>
</p>

<br />

## Stack

🔹 **[Electron](https://www.electronjs.org)** - Cross-platform desktop application framework.<br />
🔹 **[React](https://react.dev)** - The library for web and native user interfaces.<br />
🔹 **[electron-conveyor](https://github.com/guasam/electron-conveyor)** - Type-safe IPC + cross-window state.<br />
🔹 **[TypeScript](https://www.typescriptlang.org)** - Type-safe JavaScript.<br />
🔹 **[Shadcn UI](https://ui.shadcn.com)** - Beautiful and accessible component library.<br />
🔹 **[TailwindCSS](https://tailwindcss.com)** - Utility-first CSS framework.<br />
🔹 **[Electron Vite](https://electron-vite.org)** - Lightning-fast build tool based on **Vite** for fastest hot-reload.<br />
🔹 **[Electron Builder](https://www.electron.build/index.html)** - Configured for packaging applications.<br />

<br />

## In-Built Features

| Feature                     | Description                                                                    |
| --------------------------- | ------------------------------------------------------------------------------ |
| **Conveyor**                | Type-safe IPC: queries, commands, streams, events — end-to-end inference       |
| **Cross-Window Stores**     | Main-owned state synced live across every window, with opt-in persistence      |
| **Conveyor Playground**     | This branch: interactive demo of every primitive (`main` is the minimal shell) |
| **Sandboxed Renderer**      | `sandbox: true` out of the box — the conveyor preload is sandbox-compatible    |
| **Custom Titlebar & Menus** | Style the window titlebar and menus as you want                                |
| **Clean Project Structure** | Separation of main and renderer processes                                      |
| **Resources Protocol**      | Access local file resources via `res://` protocol                              |
| **Import Path Aliases**     | Keep your imports organized and clean                                          |
| **Theme Switcher**          | Built-in theme switching for dark and light mode                               |
| **Error Boundary**          | Built-in React error boundary with detailed error reporting                    |
| **Code Formatting**         | Prettier and ESLint pre-configured for code quality                            |
| **Hot Reload**              | Lightning-fast development with Vite's HMR                                     |
| **VS Code Debugging**       | Pre-configured launch configurations for debugging main and renderer processes |

<br />

## Installation

```bash
# Clone the repository
git clone https://github.com/guasam/electron-react-app

# Change directory
cd electron-react-app

# Install dependencies (use any package manager: npm, yarn, pnpm, bun)
npm install
```

<br />

## Development

```bash
npm run dev
```

This starts Electron with hot-reload. You are on the **`demo`** branch — an interactive
playground of every IPC primitive (cross-window state, streaming, background tasks, middleware),
with the real source behind each demo (hit "View code").

### Ready to build?

`main` is the same template without the playground: a themed window frame, titlebar, menus, and
the typed IPC layer, ready to build on:

```bash
git switch main
npm install
npm run dev
```

<br />

## Conveyor — Inter-Process Communication

The template's IPC is powered by [electron-conveyor](https://github.com/guasam/electron-conveyor).
One definition in main is the single source of truth for a feature; the renderer client is
**inferred** from it — no channel strings, no hand-written API classes, no query keys.

Five primitives:

| You want…                            | Use           | Renderer side                        |
| ------------------------------------ | ------------- | ------------------------------------ |
| Read something from main             | `query()`     | `await it()`, or `.useQuery()`       |
| Tell main to do something            | `command()`   | `await it()`, or `.useMutation()`    |
| Chunks pushed as they're produced    | `stream()`    | `for await`, or `.useStream()`       |
| Main pushing to the renderer         | `event()`     | `.subscribe(cb)`, or `.useEvent(cb)` |
| State shared live across all windows | `defineStore` | `useConveyorStore(def)`              |

### Adding a feature (two edits)

**1. Define the module** in `conveyor/modules/`:

```ts
// conveyor/modules/notes.ts — runs in MAIN only
import { z } from 'zod'
import { defineModule, query, command } from '../init'

export const notesModule = defineModule({
  list: query(() => readNotes()),

  // input crosses the trust boundary → schema required, validated on every call
  save: command(z.object({ title: z.string(), body: z.string() }), ({ input }) => saveNote(input)),
})
```

**2. Register it** in `conveyor/router.ts`:

```ts
export const router = createRouter(
  {
    window: windowModule,
    web: webModule,
    notes: notesModule, // ← the key becomes the module id
  },
  { createContext, use: [devLogger] }
)
```

Done — the renderer client already knows it, fully typed:

```tsx
import { conveyor } from '@/conveyor/client'

function Notes() {
  const notes = conveyor.notes.list.useQuery() // key derived from the path — never hand-written
  const save = conveyor.notes.save.useMutation({
    onSuccess: () => conveyor.notes.list.invalidate(),
  })

  return <button onClick={() => save.mutate({ title: 'Hi', body: '...' })}>Save</button>
}
```

Outside React, every member is a plain typed call: `await conveyor.notes.list()`.

### Handler context

Every handler receives `ctx`: the calling `window` and `sender`, plus the app context defined in
`conveyor/init.ts` (this template provides `appStartedAt`, the `windows` manager, and
`openWindow`). Middleware can guard and widen it:

```ts
const authed = command.use(requireUser) // a reusable guarded base
export const account = defineModule({
  delete: authed(({ ctx }) => deleteAccount(ctx.user.id)),
})
```

### Streams (LLM-style)

```ts
// main
respond: stream(z.string(), async function* ({ input, signal }) {
  for await (const token of llm.complete(input)) {
    if (signal.aborted) return
    yield token
  }
})

// renderer
for await (const token of conveyor.stream.respond(prompt)) append(token)
```

### Events (main → renderer push)

```ts
// main — typed emitters per window or fan-out via the window manager
const emit = createEmitter(windowModule, win)
win.on('focus', () => emit.onFocusChange(true))

// renderer
conveyor.window.onFocusChange.useEvent(setFocused)
```

### Cross-window stores

```ts
// conveyor/stores/shared.ts — pure, imported by BOTH processes
export const sharedStore = defineStore('shared', {
  state: { count: 0, notes: [] as string[] },
  schemas: { add: z.string() }, // payloads validated in main; types flow from the schema
  actions: {
    add: (s, note) => {
      s.notes.push(note)
    },
    increment: (s) => {
      s.count += 1
    },
  },
  persist: true, // survives restarts (JSON under userData)
})

// renderer — feels local, synced across every window
const count = useConveyorStore(sharedStore, (s) => s.count)
const { add, increment } = useConveyorActions(sharedStore)
```

### Errors

Failures re-throw in the renderer as `ConveyorError` with a stable `code` — including custom codes
thrown by your handlers (`throw new ConveyorError('LOCKED', '...')`). Branch on `err.code`, never
on message strings. See the playground's **Middleware** page for a working example.

📖 **Full API documentation: [electron-conveyor](https://github.com/guasam/electron-conveyor)**

<br />

## Custom Window Components

This template includes a custom window implementation with:

- Custom titlebar with app icon
- Window control buttons (minimize, maximize, close)
- Menu system with keyboard shortcuts
- Dark/light mode toggle
- Cross-platform support for Windows and macOS

<br />

### Titlebar Menu Toggle

The titlebar menu can be toggled using:

- **Windows**: Press the `Alt` key
- **macOS**: Press the `Option (⌥)` key

When you press the toggle key:

- If the menu is hidden, it becomes visible
- If the menu is already visible, it gets hidden
- The menu only toggles if menu items are available

<br />

### Customizing Menu Items

To add, remove or modify menu items, update the following file:

- `app/shell/menu.ts`

<br />

## Key Directories Explained

#### `app/` - Renderer Process

- **React application** that runs in the browser window
- `app/shell/` — titlebar, menus, window frame, theme
- `app/pages/` — the playground's capability pages
- `app/components/` — shared UI (`ui/` is stock shadcn; the rest is the playground's)

#### `conveyor/` - The IPC Surface

- `conveyor/init.ts` — authoring primitives bound to the app's context
- `conveyor/modules/` — feature modules (**main-process only**; the renderer imports only `type AppRouter`)
- `conveyor/stores/` — cross-window store definitions (pure, imported by both processes)
- `conveyor/router.ts` — the single registration point (modules, stores, middleware, context)
- `conveyor/client.ts` — the typed renderer client with hooks

#### `lib/main/` - Main Process

- Window creation (`app.ts`, with the window manager), app lifecycle, `res://` protocol

#### `lib/preload/` - Preload Script

- Two lines: expose the conveyor bridge. It never changes as your API grows, and it is
  sandbox-compatible — the renderer runs with `sandbox: true`

<br />

## Path Aliases

```ts
import { Button } from '@/app/components/ui/button'
import { conveyor } from '@/conveyor/client'
```

- `@/app/` → `app/` (renderer)
- `@/lib/` → `lib/` (main + preload)
- `@/conveyor/` → `conveyor/` (the IPC surface)
- `@/resources/` → `resources/` (build resources)

<br />

## Development Workflow

1. **UI Development**: Work in `app/` with React components
2. **IPC**: Add a module in `conveyor/modules/`, register it in `conveyor/router.ts`
3. **Window Features**: Customize the shell in `app/shell/`
4. **Checks**: `npm run typecheck`, `npm run lint`, `npm run format`

<br />

## Building for Production

```bash
# For Windows
npm run build:win

# For macOS
npm run build:mac

# For Linux
npm run build:linux

# Unpacked for all platforms
npm run build:unpack
```

Distribution files will be located in the `dist` directory.
