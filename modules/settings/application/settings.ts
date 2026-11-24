import type { Clock, IdGenerator } from '../../../shared/domain/ports'
import { AppError } from '../../../shared/domain/errors'
import type { SettingsRepository } from '../domain/repositories'
import {
  normalizeDraft,
  normalizeKey,
  validateRevision,
  type SettingDraft,
  type SettingsQuery,
} from '../domain/setting'

export class SettingsService {
  constructor(
    private readonly repository: SettingsRepository,
    private readonly clock: Clock,
    private readonly ids: IdGenerator
  ) {}
  list(query: SettingsQuery) {
    if (!Number.isInteger(query.limit) || query.limit < 1 || query.limit > 100)
      throw new AppError('INVALID_INPUT', 'Page size must be between 1 and 100.')
    if (query.cursor) normalizeKey(query.cursor.key)
    return this.repository.list(query)
  }
  async get(key: string) {
    const setting = await this.repository.get(normalizeKey(key))
    if (!setting) throw new AppError('NOT_FOUND', 'Setting no longer exists.')
    return setting
  }
  async create(input: SettingDraft) {
    const draft = normalizeDraft(input),
      now = this.clock.now()
    return this.repository.create({ ...draft, generation: this.ids.next(), createdAt: now, updatedAt: now, version: 1 })
  }
  async update(input: SettingDraft & { expectedVersion: number; expectedGeneration: string }) {
    const draft = normalizeDraft(input)
    const expected = { version: input.expectedVersion, generation: input.expectedGeneration }
    validateRevision(expected)
    return this.repository.update(draft.key, expected, { value: draft.value, updatedAt: this.clock.now() })
  }
  async delete(input: { key: string; expectedVersion: number; expectedGeneration: string }) {
    const key = normalizeKey(input.key)
    const expected = { version: input.expectedVersion, generation: input.expectedGeneration }
    validateRevision(expected)
    return this.repository.delete(key, expected)
  }
}
