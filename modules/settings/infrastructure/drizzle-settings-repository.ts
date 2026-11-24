import { and, asc, eq, gt, sql } from 'drizzle-orm'
import type { AppDatabase } from '../../../lib/main/infrastructure/database/database'
import { AppError } from '../../../shared/domain/errors'
import type { SettingsRepository } from '../domain/repositories'
import type { Setting, SettingChanges, SettingRevision, SettingsQuery } from '../domain/setting'
import { settings } from './schema'

export class DrizzleSettingsRepository implements SettingsRepository {
  constructor(private readonly db: AppDatabase) {}
  private async access<T>(work: () => T, creating = false): Promise<T> {
    try {
      return work()
    } catch (error) {
      let cause: unknown = error
      for (let depth = 0; cause && depth < 4; depth++) {
        if (typeof cause === 'object' && 'code' in cause) {
          const code = String(cause.code)
          if (code.startsWith('SQLITE_BUSY'))
            throw new AppError('STORAGE_BUSY', 'Storage is busy. Please try the action again.')
          if (creating && ['SQLITE_CONSTRAINT_PRIMARYKEY', 'SQLITE_CONSTRAINT_UNIQUE'].includes(code))
            throw new AppError('ALREADY_EXISTS', 'A setting with this key already exists.', 'key')
        }
        cause = typeof cause === 'object' && 'cause' in cause ? cause.cause : undefined
      }
      throw error
    }
  }
  list({ limit, cursor }: SettingsQuery) {
    return this.access(() => {
      const rows = this.db
        .select()
        .from(settings)
        .where(cursor ? gt(settings.key, cursor.key) : undefined)
        .orderBy(asc(settings.key))
        .limit(limit + 1)
        .all()
      const items = rows.slice(0, limit),
        last = items.at(-1)
      return { items, nextCursor: rows.length > limit && last ? { key: last.key } : null }
    })
  }
  get(key: string) {
    return this.access(() => this.db.select().from(settings).where(eq(settings.key, key)).get() ?? null)
  }
  create(setting: Setting) {
    return this.access(() => this.db.insert(settings).values(setting).returning().get(), true)
  }
  mergeMany(batch: Setting[]) {
    return this.access(() => {
      this.db.transaction(
        (tx) => {
          for (const setting of batch)
            tx.insert(settings)
              .values(setting)
              .onConflictDoUpdate({
                target: settings.key,
                set: { value: setting.value, updatedAt: setting.updatedAt, version: sql`${settings.version} + 1` },
              })
              .run()
        },
        { behavior: 'immediate' }
      )
    })
  }
  update(key: string, expected: SettingRevision, changes: SettingChanges) {
    return this.access(() =>
      this.db.transaction(
        (tx) => {
          const row = tx
            .update(settings)
            .set({ ...changes, version: sql`${settings.version} + 1` })
            .where(
              and(
                eq(settings.key, key),
                eq(settings.generation, expected.generation),
                eq(settings.version, expected.version)
              )
            )
            .returning()
            .get()
          if (row) return row
          this.classify(tx, key)
        },
        { behavior: 'immediate' }
      )
    )
  }
  delete(key: string, expected: SettingRevision) {
    return this.access(() => {
      this.db.transaction(
        (tx) => {
          const result = tx
            .delete(settings)
            .where(
              and(
                eq(settings.key, key),
                eq(settings.generation, expected.generation),
                eq(settings.version, expected.version)
              )
            )
            .run()
          if (!result.changes) this.classify(tx, key)
        },
        { behavior: 'immediate' }
      )
    })
  }
  private classify(db: Pick<AppDatabase, 'select'>, key: string): never {
    if (!db.select().from(settings).where(eq(settings.key, key)).get())
      throw new AppError('NOT_FOUND', 'Setting no longer exists.')
    throw new AppError(
      'CONFLICT',
      'Setting changed in another window. Your draft is preserved; reload the current setting before saving again.'
    )
  }
}
