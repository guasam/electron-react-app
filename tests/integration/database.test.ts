import { afterEach, describe, expect, it } from 'vitest'
import { mkdtempSync, rmSync, writeFileSync, mkdirSync, copyFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import Database from 'better-sqlite3'
import { openDatabase } from '../../lib/main/infrastructure/database/database'

const directories: string[] = []
afterEach(() => directories.splice(0).forEach((dir) => rmSync(dir, { recursive: true, force: true })))
function profile() {
  const dir = mkdtempSync(join(tmpdir(), 'starter-db-'))
  directories.push(dir)
  return dir
}
function fixture(folder: string, statements: string[]) {
  mkdirSync(join(folder, 'meta'), { recursive: true })
  writeFileSync(
    join(folder, 'meta/_journal.json'),
    JSON.stringify({
      version: '7',
      dialect: 'sqlite',
      entries: statements.map((_, i) => ({
        idx: i,
        version: '6',
        when: 1000 + i,
        tag: `000${i}_fixture`,
        breakpoints: true,
      })),
    })
  )
  statements.forEach((sql, i) =>
    writeFileSync(join(folder, `000${i}_fixture.sql`), sql.replaceAll('; ', ';--> statement-breakpoint\n'))
  )
}
describe('database lifecycle', () => {
  it('creates a database with production migrations and does not replay them', async () => {
    const filename = join(profile(), 'data/app.sqlite')
    const db = await openDatabase({ filename, migrationsFolder: resolve('drizzle') })
    const count = db.sqlite.prepare('SELECT COUNT(*) AS total FROM __drizzle_migrations').get()
    try {
      expect(db.sqlite.prepare("SELECT name FROM sqlite_master WHERE name='settings'").get()).toEqual({
        name: 'settings',
      })
      expect(db.sqlite.prepare("SELECT name FROM sqlite_master WHERE name='tasks'").get()).toBeUndefined()
    } finally {
      db.close()
    }
    const reopened = await openDatabase({ filename, migrationsFolder: resolve('drizzle') })
    expect(reopened.sqlite.prepare('SELECT COUNT(*) AS total FROM __drizzle_migrations').get()).toEqual(count)
    reopened.close()
  })
  it('rolls back failed migration statements and can retry a corrected build', async () => {
    const dir = profile(),
      folder = join(dir, 'migrations'),
      filename = join(dir, 'app.sqlite')
    fixture(folder, ['CREATE TABLE sample (id INTEGER); INSERT INTO sample VALUES (7);'])
    const first = await openDatabase({ filename, migrationsFolder: folder })
    first.close()
    fixture(folder, [
      'CREATE TABLE sample (id INTEGER); INSERT INTO sample VALUES (7);',
      'ALTER TABLE sample ADD COLUMN note TEXT;--> statement-breakpoint\nINVALID SQL;',
    ])
    await expect(openDatabase({ filename, migrationsFolder: folder })).rejects.toThrow()
    const check = new Database(filename)
    expect(check.prepare('SELECT * FROM sample').all()).toEqual([{ id: 7 }])
    expect(check.prepare('SELECT COUNT(*) AS total FROM __drizzle_migrations').get()).toEqual({ total: 1 })
    check.close()
    fixture(folder, [
      'CREATE TABLE sample (id INTEGER); INSERT INTO sample VALUES (7);',
      'ALTER TABLE sample ADD COLUMN note TEXT;',
    ])
    const repaired = await openDatabase({ filename, migrationsFolder: folder })
    expect(repaired.sqlite.prepare('SELECT * FROM sample').all()).toEqual([{ id: 7, note: null }])
    expect(repaired.backupPath).toBeTruthy()
    const backup = new Database(repaired.backupPath!, { readonly: true })
    expect(backup.prepare('SELECT * FROM sample').all()).toEqual([{ id: 7 }])
    backup.close()
    repaired.close()
    const restoredFilename = join(dir, 'restored.sqlite')
    copyFileSync(repaired.backupPath!, restoredFilename)
    const restored = await openDatabase({ filename: restoredFilename, migrationsFolder: folder })
    expect(restored.sqlite.prepare('SELECT * FROM sample').all()).toEqual([{ id: 7, note: null }])
    restored.close()
  })
  it('refuses newer and tampered histories without changing user data', async () => {
    const dir = profile(),
      folder = join(dir, 'migrations'),
      filename = join(dir, 'app.sqlite')
    fixture(folder, ['CREATE TABLE sample (id INTEGER); INSERT INTO sample VALUES (9);'])
    const db = await openDatabase({ filename, migrationsFolder: folder })
    db.sqlite.prepare("UPDATE __drizzle_migrations SET hash='unknown'").run()
    db.close()
    await expect(openDatabase({ filename, migrationsFolder: folder })).rejects.toMatchObject({
      code: 'INCOMPATIBLE_DATABASE',
    })
    const check = new Database(filename)
    expect(check.prepare('SELECT * FROM sample').all()).toEqual([{ id: 9 }])
    check.close()
  })
  it('refuses a populated database without a recognized migration ledger', async () => {
    const filename = join(profile(), 'app.sqlite'),
      db = new Database(filename)
    db.exec('CREATE TABLE foreign_data (id INTEGER)')
    db.close()
    await expect(openDatabase({ filename, migrationsFolder: resolve('drizzle') })).rejects.toMatchObject({
      code: 'INCOMPATIBLE_DATABASE',
    })
  })
  it('refuses a newer schema and preserves its data for a compatible build', async () => {
    const dir = profile(),
      folder = join(dir, 'migrations'),
      filename = join(dir, 'app.sqlite')
    const initial = 'CREATE TABLE sample (id INTEGER); INSERT INTO sample VALUES (9);'
    fixture(folder, [initial, 'ALTER TABLE sample ADD COLUMN note TEXT;'])
    const db = await openDatabase({ filename, migrationsFolder: folder })
    db.close()
    fixture(folder, [initial])
    await expect(openDatabase({ filename, migrationsFolder: folder })).rejects.toMatchObject({
      code: 'INCOMPATIBLE_DATABASE',
    })
    const check = new Database(filename)
    expect(check.prepare('SELECT * FROM sample').all()).toEqual([{ id: 9, note: null }])
    check.close()
  })
  it('stops an upgrade if its recovery snapshot cannot be created', async () => {
    const dir = profile(),
      folder = join(dir, 'migrations'),
      filename = join(dir, 'app.sqlite')
    const initial = 'CREATE TABLE sample (id INTEGER); INSERT INTO sample VALUES (9);'
    fixture(folder, [initial])
    const db = await openDatabase({ filename, migrationsFolder: folder })
    db.close()
    writeFileSync(join(dir, 'recovery'), 'blocks snapshot directory')
    fixture(folder, [initial, 'ALTER TABLE sample ADD COLUMN note TEXT;'])
    await expect(openDatabase({ filename, migrationsFolder: folder })).rejects.toThrow()
    const check = new Database(filename)
    expect(check.prepare('SELECT * FROM sample').all()).toEqual([{ id: 9 }])
    check.close()
  })
})
