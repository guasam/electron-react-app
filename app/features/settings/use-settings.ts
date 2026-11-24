import { conveyor } from '@/conveyor/client'
import type { ListSettingsInput } from '@/modules/settings/contracts/settings'

export function useSettings(input: ListSettingsInput) {
  const refresh = () => conveyor.settings.list.invalidate()
  const list = conveyor.settings.list.useQuery({ input })
  conveyor.settings.changed.useEvent(() => {
    void refresh()
  })
  return {
    list,
    create: conveyor.settings.create.useMutation({ retry: false, onSuccess: refresh }),
    update: conveyor.settings.update.useMutation({ retry: false, onSuccess: refresh }),
    remove: conveyor.settings.delete.useMutation({ retry: false, onSuccess: refresh }),
    importArchive: conveyor.settings.importArchive.useMutation({ retry: false, onSuccess: refresh }),
    exportArchive: conveyor.settings.exportArchive.useMutation({ retry: false }),
  }
}
