import type { Setting, SettingChanges, SettingRevision, SettingsPage, SettingsQuery } from './setting'

export interface SettingsRepository {
  list(query: SettingsQuery): Promise<SettingsPage>
  get(key: string): Promise<Setting | null>
  create(setting: Setting): Promise<Setting>
  // Atomically merge by key, preserving creation times and incrementing existing versions.
  mergeMany(settings: Setting[]): Promise<void>
  update(key: string, expected: SettingRevision, changes: SettingChanges): Promise<Setting>
  delete(key: string, expected: SettingRevision): Promise<void>
}
export interface SettingsArchiveRepository {
  read(): Promise<string | null>
  write(contents: string): Promise<boolean>
}
