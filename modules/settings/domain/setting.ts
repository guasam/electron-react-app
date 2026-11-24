import { AppError } from '../../../shared/domain/errors'

export interface SettingDraft {
  key: string
  value: string
}
export interface Setting extends SettingDraft {
  generation: string
  createdAt: string
  updatedAt: string
  version: number
}
export interface SettingRevision {
  generation: string
  version: number
}
export interface SettingChanges {
  value: string
  updatedAt: string
}
export interface SettingsQuery {
  limit: number
  cursor?: { key: string }
}
export interface SettingsPage {
  items: Setting[]
  nextCursor: { key: string } | null
}

export function normalizeKey(input: string): string {
  const key = input.trim()
  if (key.length > 100 || !/^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(key))
    throw new AppError(
      'INVALID_INPUT',
      'Enter a key of 1-100 letters, digits, dots, underscores or hyphens, starting with a letter or digit.',
      'key'
    )
  return key
}
export function normalizeDraft(input: SettingDraft): SettingDraft {
  const key = normalizeKey(input.key)
  if (input.value.length > 5000) throw new AppError('INVALID_INPUT', 'Value must be at most 5,000 characters.', 'value')
  return { key, value: input.value }
}
export function validateVersion(version: number) {
  if (!Number.isSafeInteger(version) || version < 1)
    throw new AppError('INVALID_INPUT', 'Expected version must be a positive integer.')
}
export function validateRevision(revision: SettingRevision) {
  validateVersion(revision.version)
  if (!revision.generation || revision.generation.length > 128)
    throw new AppError('INVALID_INPUT', 'Expected generation is required.')
}
