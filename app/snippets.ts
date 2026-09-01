export interface Snippet {
  file: string
  code: string
  output: string
}

/** Focused, illustrative source behind each capability, shown in the code drawer. */
export const SNIPPETS: Record<string, Snippet> = {
  overview: {
    file: 'conveyor/router.ts',
    code: `export const router = createRouter({
  window: windowModule,      // module ids come from these keys
  web: webModule,
  stream: streamModule,      // ...and the playground's features
  files: filesModule,
  tasks: tasksModule,
}, {
  createContext: () => ({ appStartedAt, windows, openWindow }),
  use: [devLogger],          // global middleware
  stores: [sharedStore],     // cross-window stores
})

// the renderer infers its whole typed client from just:
export type AppRouter = typeof router`,
    output: 'one typed surface · zero channel strings',
  },
  stream: {
    file: 'conveyor/modules/stream.ts',
    code: `respond: stream(z.string(), async function* ({ input, signal }) {
  for (const token of reply(input)) {
    if (signal.aborted) return       // cancellation, built in
    yield token
  }
})

// renderer: consume like any async iterable
for await (const token of conveyor.stream.respond(prompt)) {
  append(token)
}`,
    output: 'streaming · tokens flowing',
  },
  analyzer: {
    file: 'conveyor/modules/analyzer.ts',
    code: `pick: command(async ({ ctx }) => {
  const r = await dialog.showOpenDialog(ctx.window, { properties: ['openDirectory'] })
  return r.canceled ? null : r.filePaths[0]
}),

scan: stream(z.string(), async function* ({ input: root, signal }) {
  for (const dir of walk(root)) {            // REAL fs work, main-only
    if (signal.aborted) return               // Stop is instant
    yield { kind: 'progress', files, bytes, current: dir }
  }
  yield { kind: 'done', entries }            // one channel, two chunk kinds
})

// renderer: one loop, discriminated on kind
for await (const c of conveyor.analyzer.scan(path)) {
  c.kind === 'progress' ? setProgress(c) : setResult(c)
}`,
    output: 'scanning · 41,392 files · 1.2 GB',
  },
  system: {
    file: 'conveyor/modules/system.ts',
    code: `info: query(() => ({
  cpuCount: os.cpus().length,
  totalMem: os.totalmem(),
  freeMem: os.freemem(),
}))

// renderer: cached + auto-refreshing via TanStack Query —
// the key derives from the call path, never written by hand
const info = conveyor.system.info.useQuery({ refetchInterval: 1500 })`,
    output: 'sampled every 1.5s',
  },
  store: {
    file: 'conveyor/stores/shared.ts',
    code: `export const sharedStore = defineStore('shared', {
  state: { count: 0, notes: [] as string[] },
  schemas: { add: z.string() },        // payloads are validated in main
  actions: {
    increment: (s) => { s.count += 1 },
    add: (s, note) => { s.notes.push(note) },   // note: string — from the schema
  },
  persist: true,                       // JSON under userData, survives restarts
})

// renderer: feels local, synced across every window
const count = useConveyorStore(sharedStore, (s) => s.count)
const { increment, add } = useConveyorActions(sharedStore)`,
    output: 'store synced across windows',
  },
  secure: {
    file: 'conveyor/modules/secure.ts',
    code: `const requireUnlocked = middleware(({ next }) => {
  if (!unlocked) throw new ConveyorError('LOCKED', 'Unlock first')
  return next()
})

const guarded = query.use(requireUnlocked)   // a reusable guarded base

readSecret: guarded(({ ctx }) => ({ secret, bootedAt: ctx.appStartedAt }))

// renderer: branch on the typed code, not message strings
catch (e) { if (e.code === 'LOCKED') showUnlockHint() }`,
    output: 'guard passed · secret served',
  },
}
