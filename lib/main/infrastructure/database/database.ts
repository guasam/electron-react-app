import Database from 'better-sqlite3'
import { drizzle } from 'drizzle-orm/better-sqlite3'
import { migrate } from 'drizzle-orm/better-sqlite3/migrator'
import { readMigrationFiles } from 'drizzle-orm/migrator'
import { existsSync, mkdirSync, statSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { randomUUID } from 'node:crypto'
import * as schema from '../../../../modules/settings/infrastructure/schema'
import { AppError } from '../../../../shared/domain/errors'

export type AppDatabase = ReturnType<typeof drizzle<typeof schema>>
export interface DatabaseResource {
  db: AppDatabase
  sqlite: Database.Database
  backupPath?: string
  close(): void
}

export async function openDatabase(options: { filename: string; migrationsFolder: string }): Promise<DatabaseResource> {
  const migrations = readMigrationFiles({ migrationsFolder: options.migrationsFolder })
  let applied = 0
  if (existsSync(options.filename) && statSync(options.filename).size > 0) {
    const probe = new Database(options.filename, { readonly: true, fileMustExist: true })
    try {
      const tables = probe
        .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'")
        .all() as { name: string }[]
      const history = tables.some((table) => table.name === '__drizzle_migrations')
        ? (probe.prepare('SELECT hash, created_at FROM __drizzle_migrations ORDER BY created_at').all() as {
            hash: string
            created_at: number
          }[])
        : []
      if (
        (!history.length && tables.some((table) => table.name !== '__drizzle_migrations')) ||
        history.length > migrations.length ||
        history.some(
          (row, i) => row.hash !== migrations[i].hash || Number(row.created_at) !== migrations[i].folderMillis
        )
      ) {
        throw new AppError(
          'INCOMPATIBLE_DATABASE',
          'This database belongs to a different application version. Open it with a compatible build; do not reset its data.'
        )
      }
      applied = history.length
    } finally {
      probe.close()
    }
  }
  mkdirSync(dirname(options.filename), { recursive: true })
  const sqlite = new Database(options.filename, { timeout: 100 })
  try {
    sqlite.pragma('foreign_keys = ON')
    sqlite.pragma('journal_mode = WAL')
    sqlite.pragma('synchronous = FULL')
    let backupPath: string | undefined
    if (applied > 0 && applied < migrations.length) {
      const directory = join(dirname(options.filename), 'recovery')
      mkdirSync(directory, { recursive: true })
      backupPath = join(directory, `before-upgrade-${Date.now()}-${randomUUID()}.sqlite`)
      await sqlite.backup(backupPath)
    }
    const db = drizzle(sqlite, { schema })
    migrate(db, { migrationsFolder: options.migrationsFolder })
    return {
      db,
      sqlite,
      backupPath,
      close: () => {
        if (sqlite.open) sqlite.close()
      },
    }
  } catch (error) {
    sqlite.close()
    throw error
  }
}
