import { z } from 'zod'
import { defineModule, query, command, event } from '../init'
import {
  createSettingSchema,
  updateSettingSchema,
  listSettingsSchema,
  deleteSettingSchema,
  settingIdentitySchema,
  toSettingDto,
  toSettingsPageDto,
} from '../../modules/settings/contracts/settings'

export const settingsModule = defineModule({
  list: query(listSettingsSchema, async ({ ctx, input }) =>
    toSettingsPageDto(await ctx.business.run(ctx.window!, ({ settings }) => settings.list(input)))
  ),
  get: query(settingIdentitySchema, async ({ ctx, input }) =>
    toSettingDto(await ctx.business.run(ctx.window!, ({ settings }) => settings.get(input.key)))
  ),
  create: command(createSettingSchema, async ({ ctx, input }) =>
    toSettingDto(
      await ctx.business.run(ctx.window!, ({ settings }) => settings.create(input), ctx.notifySettingsChanged)
    )
  ),
  update: command(updateSettingSchema, async ({ ctx, input }) =>
    toSettingDto(
      await ctx.business.run(ctx.window!, ({ settings }) => settings.update(input), ctx.notifySettingsChanged)
    )
  ),
  delete: command(deleteSettingSchema, ({ ctx, input }) =>
    ctx.business.run(ctx.window!, ({ settings }) => settings.delete(input), ctx.notifySettingsChanged)
  ),
  importArchive: command(({ ctx }) =>
    ctx.business.run(
      ctx.window!,
      ({ archives }) => archives.import(),
      (result) => {
        if (!result.cancelled && result.count) ctx.notifySettingsChanged()
      }
    )
  ),
  exportArchive: command(({ ctx }) => ctx.business.run(ctx.window!, ({ archives }) => archives.export())),
  changed: event(z.object({}).strict()),
})
