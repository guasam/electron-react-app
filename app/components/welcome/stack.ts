import { AppWindow, Atom, Blocks, Braces, Cable, Package, Palette, Sparkles, Zap, type LucideIcon } from 'lucide-react'

/** One entry in the welcome tour: what a piece of the stack is, and what it buys you here. */
export interface StackEntry {
  id: string
  label: string
  icon: LucideIcon
  /** The project's own brand colour, used to tint its chip and icon. Conveyor borrows the app's. */
  color: string
  tagline: string
  body: string[]
  highlights: { title: string; description: string }[]
  docs: string
  /** Renders through the landing hero instead of the standard panel. Exactly one entry sets it. */
  hero?: boolean
}

export const STACK: StackEntry[] = [
  {
    id: 'overview',
    color: '#ff5c3a',
    label: 'Overview',
    icon: Sparkles,
    hero: true,
    tagline: 'A starting point, not a framework',
    body: [],
    highlights: [
      { title: 'Nothing to unpick', description: 'The showcase lives in one folder with no wiring anywhere else' },
      { title: 'Typed end to end', description: 'One router type flows from the main process to the renderer' },
      { title: 'Themed already', description: 'Light and dark tokens, applied across the shell and components' },
    ],
    docs: 'https://github.com/guasam/electron-react-app',
  },
  {
    id: 'electron',
    color: '#47848f',
    label: 'Electron',
    icon: AppWindow,
    tagline: 'Chromium and Node.js in a single runtime',
    body: [
      'Electron pairs a Chromium renderer with a Node.js main process, so the interface is ordinary web code while the parts that need the machine keep full system access.',
      'The split matters: the renderer here runs sandboxed, and anything touching the filesystem, the native menu, or the window itself crosses a deliberate boundary to reach the main process.',
    ],
    highlights: [
      { title: 'Web technologies', description: 'Build the interface with the DOM, CSS, and the tools you know' },
      { title: 'One codebase', description: 'The same source ships to macOS, Windows, and Linux' },
      { title: 'Real system access', description: 'Files, menus, notifications, and windows, from the main process' },
    ],
    docs: 'https://www.electronjs.org/docs/latest',
  },
  {
    id: 'conveyor',
    color: '#ff5c3a',
    label: 'Conveyor',
    icon: Cable,
    tagline: 'Typed IPC and live state across every window',
    body: [
      'Define a feature once in the main process and the renderer infers its entire client from that one type. No hand-written client, no channel strings, no query keys. Adding a call is a single edit, and a typo is a compile error rather than a runtime surprise.',
      'Five primitives cover the surface: queries read, commands write, streams push chunks as they are produced, events push from main, and stores keep state live in every window at once. Anything arriving from the renderer is validated first, because a member that takes input has to declare its schema.',
    ],
    highlights: [
      { title: 'Inferred, not written', description: 'The renderer imports one router type and gets the whole client' },
      { title: 'Hooks, auto-keyed', description: 'useQuery, useMutation, useStream and useEvent, keyed by call path' },
      { title: 'State across windows', description: 'Main owns it, every window mirrors it live, and it can persist' },
      {
        title: 'Guards that narrow',
        description: 'Middleware on reusable bases, narrowing context for everything below',
      },
      { title: 'Typed failures', description: 'Errors cross with a stable code, so you branch on code not strings' },
      {
        title: 'Testable without Electron',
        description: 'createCaller runs procedures in process, middleware included',
      },
    ],
    docs: 'https://github.com/guasam/electron-react-app',
  },
  {
    id: 'react',
    color: '#61dafb',
    label: 'React',
    icon: Atom,
    tagline: 'Interfaces composed from small pieces',
    body: [
      'React describes the interface as a function of state. You write what each state should look like, and the library works out what to change on screen.',
      'Components keep related markup, behaviour, and styling together, which is what makes a screen like this one liftable in a single folder.',
    ],
    highlights: [
      { title: 'Component model', description: 'Encapsulated pieces that own their state and compose freely' },
      { title: 'Declarative', description: 'Describe the result you want; React reconciles the difference' },
      { title: 'Deep ecosystem', description: 'Routing, data fetching, and animation are a package away' },
    ],
    docs: 'https://react.dev',
  },
  {
    id: 'vite',
    color: '#646cff',
    label: 'Vite',
    icon: Zap,
    tagline: 'Instant reloads, in both processes',
    body: [
      'electron-vite extends Vite across the whole app: main, preload, and renderer each get their own build, configured in one file.',
      'In development the renderer hot-reloads in place, and editing main-process code restarts it automatically. In production everything is bundled and tree-shaken.',
    ],
    highlights: [
      { title: 'Hot module replacement', description: 'Interface edits appear without losing the current state' },
      { title: 'Three targets, one config', description: 'Main, preload, and renderer built from a single file' },
      { title: 'Optimised output', description: 'Assets and native dependencies handled for packaging' },
    ],
    docs: 'https://electron-vite.org',
  },
  {
    id: 'typescript',
    color: '#3178c6',
    label: 'TypeScript',
    icon: Braces,
    tagline: 'Mistakes surface before the app runs',
    body: [
      'Types are what let a desktop app of any size stay approachable. Renaming a handler or changing a payload turns into a list of compiler errors rather than a runtime surprise.',
      'It pays off most at the process boundary, where a typo in a channel name would otherwise fail silently at runtime with nothing to catch it.',
    ],
    highlights: [
      { title: 'Caught at build', description: 'npm run typecheck fails before a broken build ships' },
      { title: 'Editor knows the shape', description: 'Completion and rename work across process boundaries' },
      { title: 'Inference first', description: 'Most types are derived, not written by hand' },
    ],
    docs: 'https://www.typescriptlang.org/docs/',
  },
  {
    id: 'tailwind',
    color: '#38bdf8',
    label: 'Tailwind CSS',
    icon: Palette,
    tagline: 'Styling that stays next to the markup',
    body: [
      'Utility classes keep a component readable in one place: you see the structure and its styling together, without tracing a class name to a stylesheet somewhere else.',
      'The palette here is a set of CSS custom properties, so light and dark themes are the same markup reading different token values.',
    ],
    highlights: [
      { title: 'Design tokens', description: 'Colors defined once and themed through custom properties' },
      { title: 'No dead CSS', description: 'Only the classes actually used reach the bundle' },
      { title: 'Consistent by default', description: 'Shared spacing and type scales across every screen' },
    ],
    docs: 'https://tailwindcss.com/docs',
  },
  {
    id: 'shadcn',
    // shadcn brands in plain black and white; this mid grey is the one that reads in both themes.
    color: '#8b8b93',
    label: 'shadcn/ui',
    icon: Blocks,
    tagline: 'Components you own, not ones you import',
    body: [
      'The components under app/components/ui are copied into the project rather than installed from a package. There is no wrapper to fight and no upstream release to wait on: if a button needs a different focus ring, you edit the button.',
      'They are built on Radix primitives, so keyboard handling, focus management, and screen-reader semantics are already correct in the parts that are easy to get wrong.',
    ],
    highlights: [
      { title: 'Yours to edit', description: 'Source lives in the repo, so changes are ordinary edits' },
      { title: 'Accessible underneath', description: 'Radix handles focus, keyboard, and ARIA semantics' },
      { title: 'Add only what you need', description: 'Pull in further components one at a time with the CLI' },
    ],
    docs: 'https://ui.shadcn.com/docs',
  },
  {
    id: 'builder',
    // No strong brand colour of its own; this green reads as "shipped" against both themes.
    color: '#4f9d69',
    label: 'electron-builder',
    icon: Package,
    tagline: 'From source to installers people can run',
    body: [
      'Building the app is only half of shipping it. electron-builder turns the bundled output into real installers: a .dmg for macOS, an NSIS installer for Windows, and AppImage or .deb for Linux.',
      'The configuration lives in electron-builder.yml and is already filled in, so the first release is a command rather than a research project.',
    ],
    highlights: [
      { title: 'Three platforms', description: 'Separate scripts for macOS, Windows, and Linux targets' },
      { title: 'Configured already', description: 'electron-builder.yml ships with sane defaults to adjust' },
      { title: 'Unpacked builds too', description: 'build:unpack produces a runnable directory for quick checks' },
    ],
    docs: 'https://www.electron.build',
  },
]
