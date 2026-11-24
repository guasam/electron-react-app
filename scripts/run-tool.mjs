// Run native SQLite tooling in Electron's Node runtime, matching the application ABI.
import { createRequire } from 'node:module'
import { spawnSync } from 'node:child_process'
import { dirname, join } from 'node:path'
const require = createRequire(import.meta.url)
const entries = { test: join(dirname(require.resolve('vitest/package.json')), 'vitest.mjs') }
const [tool, ...args] = process.argv.slice(2)
if (!(tool in entries)) throw new Error('Expected test')
const result = spawnSync(require('electron'), [entries[tool], ...args], {
  stdio: 'inherit',
  env: { ...process.env, ELECTRON_RUN_AS_NODE: '1' },
  windowsHide: true,
})
if (result.error) throw result.error
process.exit(result.status ?? 1)
