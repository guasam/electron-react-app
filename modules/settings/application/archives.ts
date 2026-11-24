import { AppError } from '../../../shared/domain/errors'
import type { Clock, IdGenerator } from '../../../shared/domain/ports'
import type { SettingsArchiveRepository, SettingsRepository } from '../domain/repositories'
import { normalizeDraft } from '../domain/setting'
import { archiveSchema } from '../contracts/archive'

export class ArchivesService {
  constructor(
    private readonly settings: SettingsRepository,
    private readonly archives: SettingsArchiveRepository,
    private readonly clock: Clock,
    private readonly signal: AbortSignal,
    private readonly ids: IdGenerator
  ) {}
  async import() {
    const contents = await this.archives.read()
    if (contents === null || this.signal.aborted) return { cancelled: true, count: 0 }
    let document: ReturnType<typeof archiveSchema.parse>
    try {
      document = archiveSchema.parse(JSON.parse(contents))
    } catch {
      throw new AppError('INVALID_ARCHIVE', 'Choose a valid version 1 Settings archive with at most 1,000 unique keys.')
    }
    const now = this.clock.now()
    const settings = document.settings.map((draft) => ({
      ...normalizeDraft(draft),
      generation: this.ids.next(),
      version: 1,
      createdAt: now,
      updatedAt: now,
    }))
    if (this.signal.aborted) return { cancelled: true, count: 0 }
    await this.settings.mergeMany(settings)
    return { cancelled: false, count: settings.length }
  }
  async export() {
    const { items } = await this.settings.list({ limit: 1001 })
    if (items.length > 1000)
      throw new AppError('ARCHIVE_LIMIT', 'Export supports at most 1,000 settings in one archive.')
    const document = archiveSchema.parse({ version: 1, settings: items.map(({ key, value }) => ({ key, value })) })
    const contents = JSON.stringify(document, null, 2)
    if (new TextEncoder().encode(contents).length > 5 * 1024 * 1024)
      throw new AppError('ARCHIVE_LIMIT', 'The archive exceeds the 5 MiB export limit.')
    if (this.signal.aborted) return { cancelled: true, count: 0 }
    const saved = await this.archives.write(contents)
    return { cancelled: !saved, count: saved ? items.length : 0 }
  }
}
