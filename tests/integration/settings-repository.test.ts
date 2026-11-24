import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import Database from 'better-sqlite3'
import { openDatabase, type DatabaseResource } from '../../lib/main/infrastructure/database/database'
import { DrizzleSettingsRepository } from '../../modules/settings/infrastructure/drizzle-settings-repository'
import type { Setting } from '../../modules/settings/domain/setting'

let directory: string, resource: DatabaseResource, repository: DrizzleSettingsRepository
const sample = (key: string, value = 'value'): Setting => ({
  key,
  value,
  generation: `generation-${key}`,
  createdAt: '2026-11-24T12:00:00.000Z',
  updatedAt: '2026-11-24T12:00:00.000Z',
  version: 1,
})
beforeEach(async () => {
  directory = mkdtempSync(join(tmpdir(), 'starter-repo-'))
  resource = await openDatabase({ filename: join(directory, 'app.sqlite'), migrationsFolder: resolve('drizzle') })
  repository = new DrizzleSettingsRepository(resource.db)
})
afterEach(() => {
  resource?.close()
  rmSync(directory, { recursive: true, force: true })
})
describe('SQLite settings repository', () => {
  it.each(['create-update', 'create-delete', 'import-update', 'import-delete'])(
    'rejects stale %s after a key is deleted and recreated',
    async (scenario) => {
      const original = sample('app.locale', 'en')
      await repository.create(original)
      await repository.delete(original.key, original)
      const replacement = { ...sample(original.key, 'es'), generation: 'replacement-generation' }
      if (scenario.startsWith('import')) await repository.mergeMany([replacement])
      else await repository.create(replacement)
      const stale = scenario.endsWith('update')
        ? repository.update(original.key, original, { value: 'stale', updatedAt: original.updatedAt })
        : repository.delete(original.key, original)
      await expect(stale).rejects.toMatchObject({ code: 'CONFLICT' })
      expect(await repository.get(original.key)).toMatchObject({ value: 'es', version: 1 })
    }
  )
  it('persists and pages in stable key order across a full connection restart', async () => {
    await repository.mergeMany([sample('a'), sample('b'), sample('c')])
    resource.close()
    resource = await openDatabase({ filename: join(directory, 'app.sqlite'), migrationsFolder: resolve('drizzle') })
    repository = new DrizzleSettingsRepository(resource.db)
    const first = await repository.list({ limit: 2 })
    expect(first.items.map((setting) => setting.key)).toEqual(['a', 'b'])
    expect(
      (await repository.list({ limit: 2, cursor: first.nextCursor! })).items.map((setting) => setting.key)
    ).toEqual(['c'])
  })
  it('rejects duplicate keys without replacing their values', async () => {
    await repository.create(sample('app.locale', 'en'))
    await expect(repository.create(sample('app.locale', 'es'))).rejects.toMatchObject({ code: 'ALREADY_EXISTS' })
    expect(await repository.get('app.locale')).toMatchObject({ value: 'en', version: 1 })
  })
  it('atomically checks versions and distinguishes stale writes/deletes from missing keys', async () => {
    await repository.create(sample('a'))
    const changes = { value: 'changed', updatedAt: '2026-11-24T13:00:00.000Z' }
    expect(await repository.update('a', { generation: 'generation-a', version: 1 }, changes)).toMatchObject({
      value: 'changed',
      version: 2,
    })
    await expect(repository.update('a', { generation: 'generation-a', version: 1 }, changes)).rejects.toMatchObject({
      code: 'CONFLICT',
    })
    await expect(repository.delete('a', { generation: 'generation-a', version: 1 })).rejects.toMatchObject({
      code: 'CONFLICT',
    })
    await repository.delete('a', { generation: 'generation-a', version: 2 })
    await expect(repository.update('a', { generation: 'generation-a', version: 2 }, changes)).rejects.toMatchObject({
      code: 'NOT_FOUND',
    })
  })
  it('merges existing settings preserving creation time and invalidating old versions', async () => {
    await repository.create(sample('app.locale', 'en'))
    const imported = {
      ...sample('app.locale', 'es'),
      generation: 'incoming-generation-must-not-replace-existing',
      createdAt: '2026-11-25T12:00:00.000Z',
      updatedAt: '2026-11-25T12:00:00.000Z',
    }
    await repository.mergeMany([imported, sample('app.units', 'metric')])
    expect(await repository.get('app.locale')).toEqual({
      ...sample('app.locale', 'es'),
      updatedAt: imported.updatedAt,
      version: 2,
    })
    await expect(
      repository.delete('app.locale', { generation: 'generation-app.locale', version: 1 })
    ).rejects.toMatchObject({ code: 'CONFLICT' })
  })
  it('rolls back inserts and existing-value replacements if any row fails a constraint', async () => {
    await repository.create(sample('existing', 'original'))
    await expect(
      repository.mergeMany([sample('existing', 'changed'), sample('new'), sample('invalid key')])
    ).rejects.toThrow()
    expect((await repository.list({ limit: 25 })).items).toEqual([sample('existing', 'original')])
  })
  it('reports busy storage without replaying a write', async () => {
    const other = new Database(join(directory, 'app.sqlite'))
    other.exec('BEGIN IMMEDIATE')
    try {
      await expect(repository.create(sample('locked'))).rejects.toMatchObject({ code: 'STORAGE_BUSY' })
    } finally {
      other.exec('ROLLBACK')
      other.close()
    }
    expect(await repository.get('locked')).toBeNull()
  })
})
