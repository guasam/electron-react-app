import { afterEach, describe, expect, it } from 'vitest'
import { mkdtempSync, readFileSync, rmSync, writeFileSync, mkdirSync, symlinkSync, readdirSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { FileSettingsArchiveRepository } from '../../modules/settings/infrastructure/file-settings-archive-repository'
import { ArchivesService } from '../../modules/settings/application/archives'
import { MemorySettingsRepository } from '../helpers'

const dirs: string[] = []
afterEach(() => dirs.splice(0).forEach((dir) => rmSync(dir, { recursive: true, force: true })))
function setup() {
  const dir = mkdtempSync(join(tmpdir(), 'starter-archive-'))
  dirs.push(dir)
  const protectedDirectory = join(dir, 'database')
  mkdirSync(protectedDirectory)
  const path = join(dir, 'settings.json'),
    controller = new AbortController()
  const chooser = { open: async () => path, save: async () => path }
  return {
    dir,
    path,
    chooser,
    controller,
    protectedDirectory,
    files: new FileSettingsArchiveRepository(chooser, protectedDirectory, controller.signal),
  }
}
const archive = JSON.stringify({ version: 1, settings: [{ key: 'app.locale', value: 'en' }] })
describe('archive filesystem integration', () => {
  it('reads exact byte limits and rejects one-over and multibyte overflow', async () => {
    const { path, files } = setup(),
      limit = 5 * 1024 * 1024
    writeFileSync(path, archive + ' '.repeat(limit - Buffer.byteLength(archive)))
    expect(Buffer.byteLength((await files.read())!)).toBe(limit)
    writeFileSync(path, archive + ' '.repeat(limit - Buffer.byteLength(archive) + 1))
    await expect(files.read()).rejects.toMatchObject({ code: 'ARCHIVE_LIMIT' })
    writeFileSync(path, '💥'.repeat(Math.floor(limit / 4) + 1))
    await expect(files.read()).rejects.toMatchObject({ code: 'ARCHIVE_LIMIT' })
  })
  it('replaces an existing export and leaves no temporary files', async () => {
    const { dir, path, files } = setup()
    writeFileSync(path, 'old')
    expect(await files.write(archive)).toBe(true)
    expect(readFileSync(path, 'utf8')).toBe(archive)
    expect(readdirSync(dir).sort()).toEqual(['database', 'settings.json'])
  })
  it('preserves an existing export when replacement fails', async () => {
    const { dir, path, chooser, controller, protectedDirectory } = setup()
    writeFileSync(path, 'previous export')
    const files = new FileSettingsArchiveRepository(chooser, protectedDirectory, controller.signal, async () => {
      throw new Error('replacement denied')
    })
    await expect(files.write(archive)).rejects.toMatchObject({ code: 'ARCHIVE_IO' })
    expect(readFileSync(path, 'utf8')).toBe('previous export')
    expect(readdirSync(dir).sort()).toEqual(['database', 'settings.json'])
  })
  it('refuses a protected destination reached through a junction or symlink', async () => {
    const { dir, protectedDirectory, chooser, controller } = setup()
    const alias = join(dir, 'alias')
    symlinkSync(protectedDirectory, alias, process.platform === 'win32' ? 'junction' : 'dir')
    const path = join(alias, 'app.sqlite')
    writeFileSync(path, 'database bytes')
    const files = new FileSettingsArchiveRepository(
      { ...chooser, save: async () => path },
      protectedDirectory,
      controller.signal
    )
    await expect(files.write(archive)).rejects.toMatchObject({ code: 'PROTECTED_DESTINATION' })
    expect(readFileSync(path, 'utf8')).toBe('database bytes')
  })
  it('cancels when its calling window closes during the chooser', async () => {
    const { path, protectedDirectory, controller } = setup()
    const files = new FileSettingsArchiveRepository(
      {
        open: async () => {
          controller.abort()
          return path
        },
        save: async () => null,
      },
      protectedDirectory,
      controller.signal
    )
    expect(await files.read()).toBeNull()
  })
  it('merges by key and preserves unrelated settings when reimported', async () => {
    const { path, files, controller } = setup()
    writeFileSync(path, archive)
    const settings = new MemorySettingsRepository()
    const service = new ArchivesService(settings, files, { now: () => '2026-11-24T12:00:00.000Z' }, controller.signal, {
      next: () => 'generation',
    })
    expect(await service.import()).toEqual({ cancelled: false, count: 1 })
    await settings.create({
      generation: 'units-generation',
      key: 'app.units',
      value: 'metric',
      version: 1,
      createdAt: '',
      updatedAt: '',
    })
    writeFileSync(path, JSON.stringify({ version: 1, settings: [{ key: 'app.locale', value: 'es' }] }))
    await service.import()
    expect((await settings.list({ limit: 25 })).items).toHaveLength(2)
    expect(await settings.get('app.locale')).toMatchObject({ value: 'es', version: 2 })
    expect(await settings.get('app.units')).toMatchObject({ value: 'metric', version: 1 })
  })
  it('validates all rows, duplicate keys and the row limit before writing', async () => {
    const { path, files, controller } = setup(),
      settings = new MemorySettingsRepository()
    const service = new ArchivesService(settings, files, { now: () => '2026-11-24T12:00:00.000Z' }, controller.signal, {
      next: () => 'generation',
    })
    for (const rows of [
      [
        { key: 'valid', value: '' },
        { key: ' ', value: '' },
      ],
      [
        { key: 'same', value: 'first' },
        { key: ' same ', value: 'second' },
      ],
      Array.from({ length: 1001 }, (_, i) => ({ key: `setting.${i}`, value: '' })),
    ]) {
      writeFileSync(path, JSON.stringify({ version: 1, settings: rows }))
      await expect(service.import()).rejects.toMatchObject({ code: 'INVALID_ARCHIVE' })
      expect((await settings.list({ limit: 25 })).items).toEqual([])
    }
  })
})
