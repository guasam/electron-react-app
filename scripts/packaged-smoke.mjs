import { _electron as electron, expect } from '@playwright/test'
import { existsSync, mkdirSync, mkdtempSync, rmSync } from 'node:fs'
import { resolve, join } from 'node:path'
import { tmpdir } from 'node:os'

const candidates = [
  'dist/win-unpacked/electron-react-app.exe',
  'dist/linux-unpacked/electron-react-app',
  'dist/mac-arm64/electron-react-app.app/Contents/MacOS/electron-react-app',
  'dist/mac/electron-react-app.app/Contents/MacOS/electron-react-app',
]
const executablePath = resolve(
  process.env.PACKAGED_APP_PATH ?? candidates.find((file) => existsSync(file)) ?? 'missing-package'
)
if (!existsSync(executablePath))
  throw new Error('Build the package first: pnpm run build:unpack, or set PACKAGED_APP_PATH.')
const directory = mkdtempSync(join(tmpdir(), 'starter-package-')),
  cwd = join(directory, 'unrelated-cwd'),
  profile = join(directory, 'profile')
mkdirSync(cwd)
const env = Object.fromEntries(
  Object.entries(process.env).filter(
    ([key, value]) => value !== undefined && !['ELECTRON_RUN_AS_NODE', 'ELECTRON_RENDERER_URL'].includes(key)
  )
)
env.STARTER_PROFILE_DIRECTORY = profile
let app
async function launch() {
  const launched = await electron.launch({ executablePath, cwd, env })
  expect(await launched.evaluate(({ app }) => app.isPackaged)).toBe(true)
  expect(await launched.evaluate(({ app }) => app.getPath('userData'))).toBe(profile)
  return launched
}
try {
  app = await launch()
  let window = await app.firstWindow()
  await window.getByLabel('Key', { exact: true }).fill('app.package-check')
  await window.getByLabel('Value', { exact: true }).fill('Packaged persistence check')
  await window.getByRole('button', { name: 'Create setting', exact: true }).click()
  await expect(window.getByRole('button', { name: 'Edit app.package-check' })).toBeVisible()
  await app.close()
  app = await launch()
  window = await app.firstWindow()
  await expect(window.getByRole('button', { name: 'Edit app.package-check' })).toBeVisible()
  if (process.env.SMOKE_SCREENSHOT_PATH) {
    const { dirname } = await import('node:path')
    mkdirSync(dirname(resolve(process.env.SMOKE_SCREENSHOT_PATH)), { recursive: true })
    await window.screenshot({ path: resolve(process.env.SMOKE_SCREENSHOT_PATH) })
  }
  console.log(
    `Packaged persistence passed on ${process.platform}: native SQLite, migration assets, unrelated cwd, full quit/relaunch.`
  )
} finally {
  await app?.close()
  rmSync(directory, { recursive: true, force: true })
}
