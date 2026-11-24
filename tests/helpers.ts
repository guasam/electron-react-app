import { AppError } from '../shared/domain/errors'
import type {
  Setting,
  SettingChanges,
  SettingRevision,
  SettingsPage,
  SettingsQuery,
} from '../modules/settings/domain/setting'
import type { SettingsRepository } from '../modules/settings/domain/repositories'

export class MemorySettingsRepository implements SettingsRepository {
  private readonly rows = new Map<string, Setting>()
  async get(key: string) {
    const row = this.rows.get(key)
    return row ? { ...row } : null
  }
  async list({ limit, cursor }: SettingsQuery): Promise<SettingsPage> {
    const rows = [...this.rows.values()]
      .filter((row) => !cursor || row.key > cursor.key)
      .sort((a, b) => (a.key < b.key ? -1 : a.key > b.key ? 1 : 0))
    const items = rows.slice(0, limit).map((row) => ({ ...row })),
      last = items.at(-1)
    return { items, nextCursor: rows.length > limit && last ? { key: last.key } : null }
  }
  async create(setting: Setting) {
    if (this.rows.has(setting.key))
      throw new AppError('ALREADY_EXISTS', 'A setting with this key already exists.', 'key')
    this.rows.set(setting.key, { ...setting })
    return { ...setting }
  }
  async mergeMany(settings: Setting[]) {
    for (const setting of settings) {
      const current = this.rows.get(setting.key)
      this.rows.set(
        setting.key,
        current
          ? { ...current, value: setting.value, updatedAt: setting.updatedAt, version: current.version + 1 }
          : { ...setting }
      )
    }
  }
  private current(key: string, expected: SettingRevision) {
    const row = this.rows.get(key)
    if (!row) throw new AppError('NOT_FOUND', 'Setting no longer exists.')
    if (row.version !== expected.version || row.generation !== expected.generation)
      throw new AppError('CONFLICT', 'Setting changed in another window.')
    return row
  }
  async update(key: string, expected: SettingRevision, changes: SettingChanges) {
    const setting = { ...this.current(key, expected), ...changes, version: expected.version + 1 }
    this.rows.set(key, setting)
    return { ...setting }
  }
  async delete(key: string, expected: SettingRevision) {
    this.current(key, expected)
    this.rows.delete(key)
  }
}
