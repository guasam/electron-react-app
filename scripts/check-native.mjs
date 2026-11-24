import { createRequire } from 'node:module'
import { spawnSync } from 'node:child_process'
const require = createRequire(import.meta.url)
// better-sqlite3 13 bundles Node-API prebuilds; rebuilding them needlessly requires a C++ toolchain.
const result = spawnSync(
  require('electron'),
  [
    '-e',
    "const D=require('better-sqlite3'); const db=new D(':memory:'); console.log('Electron SQLite ready:',db.prepare('select sqlite_version() as version').get().version); db.close()",
  ],
  {
    stdio: 'inherit',
    env: { ...process.env, ELECTRON_RUN_AS_NODE: '1' },
    windowsHide: true,
  }
)
if (result.error) throw result.error
process.exit(result.status ?? 1)
