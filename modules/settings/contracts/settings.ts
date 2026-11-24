import { z } from 'zod'
import type { Setting, SettingsPage } from '../domain/setting'

export const settingKeySchema = z
  .string()
  .trim()
  .min(1, 'Enter a setting key.')
  .max(100)
  .regex(
    /^[A-Za-z0-9][A-Za-z0-9._-]*$/,
    'Use letters, digits, dots, underscores or hyphens, starting with a letter or digit.'
  )
export const createSettingSchema = z.object({ key: settingKeySchema, value: z.string().max(5000) }).strict()
export const updateSettingSchema = createSettingSchema.extend({
  expectedVersion: z.number().int().positive(),
  expectedGeneration: z.string().min(1).max(128),
})
export const settingIdentitySchema = z.object({ key: settingKeySchema }).strict()
export const deleteSettingSchema = settingIdentitySchema.extend({
  expectedVersion: z.number().int().positive(),
  expectedGeneration: z.string().min(1).max(128),
})
export const listSettingsSchema = z
  .object({ limit: z.number().int().min(1).max(100).default(25), cursor: settingIdentitySchema.optional() })
  .strict()
export interface SettingDto {
  generation: string
  key: string
  value: string
  createdAt: string
  updatedAt: string
  version: number
}
export interface SettingsPageDto {
  items: SettingDto[]
  nextCursor: { key: string } | null
}
export type CreateSettingInput = z.infer<typeof createSettingSchema>
export type UpdateSettingInput = z.infer<typeof updateSettingSchema>
export type ListSettingsInput = z.infer<typeof listSettingsSchema>
export function toSettingDto(setting: Setting): SettingDto {
  return {
    generation: setting.generation,
    key: setting.key,
    value: setting.value,
    createdAt: setting.createdAt,
    updatedAt: setting.updatedAt,
    version: setting.version,
  }
}
export function toSettingsPageDto(page: SettingsPage): SettingsPageDto {
  return { items: page.items.map(toSettingDto), nextCursor: page.nextCursor ? { key: page.nextCursor.key } : null }
}
