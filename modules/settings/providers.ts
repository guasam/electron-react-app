import { asFunction, type AwilixContainer } from 'awilix'
import type { Clock, IdGenerator } from '../../shared/domain/ports'
import type { AppDatabase } from '../../lib/main/infrastructure/database/database'
import type { SettingsArchiveRepository, SettingsRepository } from './domain/repositories'
import { SettingsService } from './application/settings'
import { ArchivesService } from './application/archives'
import { DrizzleSettingsRepository } from './infrastructure/drizzle-settings-repository'
import { FileSettingsArchiveRepository, type ArchiveChooser } from './infrastructure/file-settings-archive-repository'

export interface SettingsDependencies {
  database: AppDatabase
  clock: Clock
  ids: IdGenerator
  protectedDirectory: string
  chooser: ArchiveChooser
  archiveSignal: AbortSignal
  settingsRepository: SettingsRepository
  archiveRepository: SettingsArchiveRepository
  settings: SettingsService
  archives: ArchivesService
}
export function registerSettings(container: AwilixContainer<SettingsDependencies>) {
  container.register({
    settingsRepository: asFunction(
      ({ database }: Pick<SettingsDependencies, 'database'>) => new DrizzleSettingsRepository(database)
    ).singleton(),
    archiveRepository: asFunction(
      ({
        chooser,
        protectedDirectory,
        archiveSignal,
      }: Pick<SettingsDependencies, 'chooser' | 'protectedDirectory' | 'archiveSignal'>) =>
        new FileSettingsArchiveRepository(chooser, protectedDirectory, archiveSignal)
    ).scoped(),
    settings: asFunction(
      ({ settingsRepository, clock, ids }: Pick<SettingsDependencies, 'settingsRepository' | 'clock' | 'ids'>) =>
        new SettingsService(settingsRepository, clock, ids)
    ).scoped(),
    archives: asFunction(
      ({
        settingsRepository,
        archiveRepository,
        clock,
        archiveSignal,
        ids,
      }: Pick<SettingsDependencies, 'settingsRepository' | 'archiveRepository' | 'clock' | 'archiveSignal' | 'ids'>) =>
        new ArchivesService(settingsRepository, archiveRepository, clock, archiveSignal, ids)
    ).scoped(),
  })
}
