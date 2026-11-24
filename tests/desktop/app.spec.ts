import { test, expect, _electron as electron, type ElectronApplication } from '@playwright/test'
import { mkdtempSync, rmSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import Database from 'better-sqlite3'
import { spawn } from 'node:child_process'
import { once } from 'node:events'

async function launch(profile: string) {
  const env: Record<string, string> = {}
  for (const [key, value] of Object.entries(process.env))
    if (value !== undefined && !['ELECTRON_RUN_AS_NODE', 'ELECTRON_RENDERER_URL'].includes(key)) env[key] = value
  env.STARTER_PROFILE_DIRECTORY = profile
  const app = await electron.launch({ args: [resolve('out/main/main.js')], env })
  expect(await app.evaluate(({ app }) => app.getPath('userData'))).toBe(profile)
  return app
}
test('real IPC validates settings, rejects duplicate keys and persists after full relaunch', async () => {
  const profile = mkdtempSync(join(tmpdir(), 'starter-desktop-'))
  let app: ElectronApplication | undefined
  try {
    app = await launch(profile)
    let window = await app.firstWindow()
    expect(await window.evaluate(() => globalThis.window.conveyor.manifest())).toHaveProperty(
      'settings.create',
      'command'
    )
    const bad = await window.evaluate(() =>
      globalThis.window.conveyor.invoke('conveyor:settings', 'create', { key: ' ', value: '' })
    )
    expect(bad).toMatchObject({ ok: false, error: { code: 'INVALID_INPUT' } })
    expect(
      await window.evaluate(() =>
        globalThis.window.conveyor.invoke('unrelated:channel', 'create').catch((error: Error) => error.message)
      )
    ).toContain('Unregistered')
    expect(
      await window.evaluate(() =>
        globalThis.window.conveyor.invoke('conveyor:settings', 'create', { key: 'app.locale', value: 'en' })
      )
    ).toMatchObject({ ok: true, data: { key: 'app.locale', value: 'en' } })
    expect(
      await window.evaluate(() =>
        globalThis.window.conveyor.invoke('conveyor:settings', 'create', { key: 'app.locale', value: 'fr' })
      )
    ).toMatchObject({ ok: false, error: { code: 'ALREADY_EXISTS' } })
    const stale = await window.evaluate(async () => {
      const result = await globalThis.window.conveyor.invoke('conveyor:settings', 'get', { key: 'app.locale' })
      const generation = (result as { data: { generation: string } }).data.generation
      const input = { key: 'app.locale', expectedVersion: 1, expectedGeneration: generation, value: 'es' }
      await globalThis.window.conveyor.invoke('conveyor:settings', 'update', input)
      return globalThis.window.conveyor.invoke('conveyor:settings', 'update', input)
    })
    expect(stale).toMatchObject({ ok: false, error: { code: 'CONFLICT' } })
    await app.close()
    app = await launch(profile)
    window = await app.firstWindow()
    expect(
      await window.evaluate(() => globalThis.window.conveyor.invoke('conveyor:settings', 'list', { limit: 25 }))
    ).toMatchObject({ ok: true, data: { items: [{ key: 'app.locale', value: 'es' }] } })
  } finally {
    await app?.close()
    rmSync(profile, { recursive: true, force: true })
  }
})

test('Settings UI creates, edits and confirms deletion', async () => {
  const profile = mkdtempSync(join(tmpdir(), 'starter-ui-'))
  let app: ElectronApplication | undefined
  try {
    app = await launch(profile)
    const window = await app.firstWindow()
    await expect(window.getByRole('heading', { name: 'Settings', exact: true })).toBeVisible()
    await window.getByLabel('Key', { exact: true }).fill('new')
    await window.getByLabel('Value', { exact: true }).fill('en')
    await window.getByRole('button', { name: 'Create setting', exact: true }).click()
    await window.getByRole('button', { name: 'Edit new' }).click()
    await expect(window.getByLabel('Key', { exact: true })).toHaveValue('new')
    await expect(window.getByLabel('Key', { exact: true })).toBeDisabled()
    await window.getByLabel('Value', { exact: true }).fill('es')
    await window.getByRole('button', { name: 'Save changes', exact: true }).click()
    await expect(window.getByRole('region', { name: 'Settings list' }).getByText('es', { exact: true })).toBeVisible()
    await window.getByRole('button', { name: 'Delete new' }).click()
    await window.getByRole('button', { name: 'Confirm delete' }).click()
    await expect(window.getByText('No settings here yet.')).toBeVisible()
  } finally {
    await app?.close()
    rmSync(profile, { recursive: true, force: true })
  }
})

test('two windows refresh settings and preserve a stale value until explicit reload', async () => {
  const profile = mkdtempSync(join(tmpdir(), 'starter-windows-'))
  let app: ElectronApplication | undefined
  try {
    app = await launch(profile)
    const first = await app.firstWindow()
    await first.getByLabel('Key', { exact: true }).fill('app.locale')
    await first.getByLabel('Value', { exact: true }).fill('en')
    await first.getByRole('button', { name: 'Create setting', exact: true }).click()
    const opened = app.waitForEvent('window')
    await first.getByRole('button', { name: 'New window' }).click()
    const second = await opened
    await second.getByRole('button', { name: 'Edit app.locale' }).click()
    await second.getByLabel('Value', { exact: true }).fill('my draft')
    await first.getByRole('button', { name: 'Edit app.locale' }).click()
    await first.getByLabel('Value', { exact: true }).fill('es')
    await first.getByRole('button', { name: 'Save changes', exact: true }).click()
    await expect(second.getByText('es', { exact: true })).toBeVisible()
    await second.getByRole('button', { name: 'Save changes', exact: true }).click()
    await expect(second.getByRole('alert')).toContainText('changed in another window')
    await expect(second.getByLabel('Value', { exact: true })).toHaveValue('my draft')
    await second.getByRole('button', { name: 'Reload current setting' }).click()
    await expect(second.getByLabel('Value', { exact: true })).toHaveValue('es')
  } finally {
    await app?.close()
    rmSync(profile, { recursive: true, force: true })
  }
})

test('settings archive UI replaces matching keys through real files and SQLite', async () => {
  const profile = mkdtempSync(join(tmpdir(), 'starter-files-'))
  let app: ElectronApplication | undefined
  try {
    app = await launch(profile)
    const window = await app.firstWindow(),
      path = join(profile, 'settings.json')
    await window.getByLabel('Key', { exact: true }).fill('app.locale')
    await window.getByLabel('Value', { exact: true }).fill('en')
    await window.getByRole('button', { name: 'Create setting', exact: true }).click()
    await expect(window.getByRole('button', { name: 'Edit app.locale' })).toBeVisible()
    await app.evaluate(({ dialog }, path) => {
      dialog.showSaveDialog = async () => ({ canceled: false, filePath: path })
      dialog.showOpenDialog = async () => ({ canceled: false, filePaths: [path] })
    }, path)
    await window.getByRole('button', { name: 'Export JSON' }).click()
    await expect(window.getByRole('status')).toContainText('Exported 1 setting')
    expect(JSON.parse(readFileSync(path, 'utf8')).settings).toEqual([{ key: 'app.locale', value: 'en' }])
    await window.getByRole('button', { name: 'Edit app.locale' }).click()
    await window.getByLabel('Value', { exact: true }).fill('es')
    await window.getByRole('button', { name: 'Save changes' }).click()
    await expect(window.getByText('es', { exact: true })).toBeVisible()
    await window.getByRole('button', { name: 'Import JSON' }).click()
    await expect(window.getByRole('status')).toContainText('Imported 1 setting')
    await expect(window.getByRole('button', { name: 'Edit app.locale' })).toHaveCount(1)
    await expect(window.getByText('en', { exact: true })).toBeVisible()
    await app.evaluate(({ dialog }) => {
      dialog.showOpenDialog = async () => ({ canceled: true, filePaths: [] })
    })
    await window.getByRole('button', { name: 'Import JSON' }).click()
    await expect(window.getByRole('status')).toContainText('cancelled')
    writeFileSync(path, 'invalid json')
    await app.evaluate(({ dialog }, path) => {
      dialog.showOpenDialog = async () => ({ canceled: false, filePaths: [path] })
    }, path)
    await window.getByRole('button', { name: 'Import JSON' }).click()
    await expect(window.getByRole('alert')).toContainText('valid version 1')
  } finally {
    await app?.close()
    rmSync(profile, { recursive: true, force: true })
  }
})

test('main rejects unregistered top-level and child-frame callers before creating settings', async () => {
  const profile = mkdtempSync(join(tmpdir(), 'starter-security-'))
  let app: ElectronApplication | undefined
  try {
    app = await launch(profile)
    const window = await app.firstWindow()
    const results = await app.evaluate(async ({ BrowserWindow }) => {
      // Deliberately hostile test window. Production windows retain sandboxing and no Node integration.
      const hostile = new BrowserWindow({
        show: false,
        webPreferences: {
          nodeIntegration: true,
          nodeIntegrationInSubFrames: true,
          contextIsolation: false,
          sandbox: false,
        },
      })
      try {
        await hostile.loadURL('app://starter/index.html')
        const call =
          'require("electron").ipcRenderer.invoke("conveyor:settings", "create", { key: "unauthorized", value: "" })'
        const parent = await hostile.webContents.executeJavaScript(call)
        const loaded = new Promise<void>((resolve) =>
          hostile.webContents.on('did-frame-finish-load', (_event, main) => {
            if (!main) resolve()
          })
        )
        await hostile.webContents.executeJavaScript(
          'const frame = document.createElement("iframe"); frame.src = "app://starter/index.html"; document.body.append(frame)'
        )
        await loaded
        const child = await hostile.webContents.mainFrame.frames[0].executeJavaScript(call)
        return [parent, child]
      } finally {
        hostile.destroy()
      }
    })
    for (const result of results) expect(result).toMatchObject({ ok: false, error: { code: 'UNAUTHORIZED' } })
    expect(
      await window.evaluate(() => globalThis.window.conveyor.invoke('conveyor:settings', 'list', { limit: 25 }))
    ).toMatchObject({ ok: true, data: { items: [] } })
  } finally {
    await app?.close()
    rmSync(profile, { recursive: true, force: true })
  }
})

test('unexpected database failures return a generic public error through the real bridge', async () => {
  const profile = mkdtempSync(join(tmpdir(), 'starter-errors-'))
  let app: ElectronApplication | undefined
  try {
    app = await launch(profile)
    const window = await app.firstWindow()
    const database = new Database(join(profile, 'database/app.sqlite'))
    database.exec('DROP TABLE settings')
    database.close()
    expect(
      await window.evaluate(() => globalThis.window.conveyor.invoke('conveyor:settings', 'list', { limit: 25 }))
    ).toEqual({ ok: false, error: { code: 'INTERNAL_ERROR', message: 'Something went wrong. Please try again.' } })
  } finally {
    await app?.close()
    rmSync(profile, { recursive: true, force: true })
  }
})

test('independent profiles remain isolated and a second same-profile process exits', async () => {
  const firstProfile = mkdtempSync(join(tmpdir(), 'starter-first-')),
    secondProfile = mkdtempSync(join(tmpdir(), 'starter-second-'))
  let first: ElectronApplication | undefined, second: ElectronApplication | undefined
  try {
    first = await launch(firstProfile)
    second = await launch(secondProfile)
    const window = await first.firstWindow(),
      independent = await second.firstWindow()
    expect(
      await window.evaluate(() =>
        globalThis.window.conveyor.invoke('conveyor:settings', 'create', {
          key: 'app.profile',
          value: 'First profile only',
        })
      )
    ).toMatchObject({ ok: true })
    expect(
      await independent.evaluate(() => globalThis.window.conveyor.invoke('conveyor:settings', 'list', { limit: 25 }))
    ).toMatchObject({ ok: true, data: { items: [] } })
    const env: NodeJS.ProcessEnv = { ...process.env, STARTER_PROFILE_DIRECTORY: firstProfile }
    delete env.ELECTRON_RUN_AS_NODE
    const duplicate = spawn(first.process().spawnfile, [resolve('out/main/main.js')], {
      env,
      stdio: 'ignore',
      windowsHide: true,
    })
    try {
      expect((await once(duplicate, 'exit'))[0]).toBe(0)
    } finally {
      if (duplicate.exitCode === null) duplicate.kill()
    }
    expect(
      await window.evaluate(() => globalThis.window.conveyor.invoke('conveyor:settings', 'list', { limit: 25 }))
    ).toMatchObject({ ok: true, data: { items: [{ key: 'app.profile', value: 'First profile only' }] } })
  } finally {
    await first?.close()
    await second?.close()
    rmSync(firstProfile, { recursive: true, force: true })
    rmSync(secondProfile, { recursive: true, force: true })
  }
})

test('quit releases an operation whose native chooser remains pending', async () => {
  const profile = mkdtempSync(join(tmpdir(), 'starter-quit-'))
  let app: ElectronApplication | undefined
  try {
    app = await launch(profile)
    const window = await app.firstWindow()
    await app.evaluate(({ dialog }) => {
      dialog.showOpenDialog = () => {
        Reflect.set(globalThis, 'testChooserStarted', true)
        return new Promise<{ canceled: boolean; filePaths: string[] }>(() => {})
      }
    })
    const pending = window
      .evaluate(() => globalThis.window.conveyor.invoke('conveyor:settings', 'importArchive'))
      .catch(() => null)
    await expect.poll(() => app!.evaluate(() => Reflect.get(globalThis, 'testChooserStarted'))).toBe(true)
    await app.close()
    app = undefined
    await pending
    const check = new Database(join(profile, 'database/app.sqlite'), { readonly: true })
    expect(check.prepare('SELECT COUNT(*) AS total FROM settings').get()).toEqual({ total: 0 })
    check.close()
  } finally {
    await app?.close()
    rmSync(profile, { recursive: true, force: true })
  }
})
