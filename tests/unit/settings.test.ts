import { describe, expect, it } from 'vitest'
import { SettingsService } from '../../modules/settings/application/settings'
import { toSettingDto, createSettingSchema } from '../../modules/settings/contracts/settings'
import { MemorySettingsRepository } from '../helpers'

const now = '2026-11-24T12:00:00.000Z'
function subject() {
  const repository = new MemorySettingsRepository()
  return { repository, service: new SettingsService(repository, { now: () => now }, { next: () => 'generation' }) }
}
describe('settings application rules', () => {
  it('normalizes a natural key, preserves its value and injects time', async () => {
    expect(await subject().service.create({ key: '  app.locale  ', value: ' en ' })).toEqual({
      key: 'app.locale',
      generation: 'generation',
      value: ' en ',
      createdAt: now,
      updatedAt: now,
      version: 1,
    })
  })
  it.each(['', '  ', 'invalid key', '../escape', 'x'.repeat(101)])(
    'rejects an invalid key before persistence',
    async (key) => {
      const { service, repository } = subject()
      await expect(service.create({ key, value: '' })).rejects.toMatchObject({ code: 'INVALID_INPUT' })
      expect((await repository.list({ limit: 25 })).items).toEqual([])
    }
  )
  it('rejects oversized values and invalid versions even without IPC', async () => {
    const { service } = subject()
    await expect(service.create({ key: 'valid', value: 'x'.repeat(5001) })).rejects.toMatchObject({
      code: 'INVALID_INPUT',
    })
    await expect(
      service.update({ key: 'valid', value: '', expectedGeneration: 'generation', expectedVersion: 0 })
    ).rejects.toMatchObject({
      code: 'INVALID_INPUT',
    })
    await expect(
      service.delete({ key: 'valid', expectedGeneration: 'generation', expectedVersion: 1.5 })
    ).rejects.toMatchObject({
      code: 'INVALID_INPUT',
    })
  })
  it('rejects duplicate creates and preserves the winner after a version conflict', async () => {
    const { service } = subject()
    await service.create({ key: 'app.locale', value: 'en' })
    await expect(service.create({ key: 'app.locale', value: 'es' })).rejects.toMatchObject({ code: 'ALREADY_EXISTS' })
    await service.update({ key: 'app.locale', value: 'es', expectedGeneration: 'generation', expectedVersion: 1 })
    await expect(
      service.update({ key: 'app.locale', value: 'fr', expectedGeneration: 'generation', expectedVersion: 1 })
    ).rejects.toMatchObject({
      code: 'CONFLICT',
    })
    expect(await service.get('app.locale')).toMatchObject({ value: 'es', version: 2 })
  })
  it('selects DTO fields explicitly and shares portable validation with the editor', async () => {
    const setting = await subject().service.create({ key: 'app.locale', value: 'en' })
    expect(toSettingDto({ ...setting, internalSecret: 'hidden' } as typeof setting)).not.toHaveProperty(
      'internalSecret'
    )
    expect(createSettingSchema.safeParse({ key: ' ', value: '' }).success).toBe(false)
  })
})
