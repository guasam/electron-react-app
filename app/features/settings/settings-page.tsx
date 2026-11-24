import { useState } from 'react'
import { AlertDialog } from 'radix-ui'
import { Plus, Download, Upload, Pencil, Trash2 } from 'lucide-react'
import { conveyor } from '@/conveyor/client'
import { Button } from '@/app/components/ui/button'
import type { SettingDto, ListSettingsInput } from '@/modules/settings/contracts/settings'
import { SettingEditor } from './setting-editor'
import { useSettings } from './use-settings'

export function SettingsPage() {
  const [cursors, setCursors] = useState<NonNullable<ListSettingsInput['cursor']>[]>([])
  const [selected, setSelected] = useState<SettingDto>(),
    [deleting, setDeleting] = useState<SettingDto>()
  const [notice, setNotice] = useState(''),
    [error, setError] = useState('')
  const settings = useSettings({ limit: 25, ...(cursors.length ? { cursor: cursors.at(-1) } : {}) })
  const nextCursor = settings.list.data?.nextCursor
  const pending =
    settings.create.isPending ||
    settings.update.isPending ||
    settings.remove.isPending ||
    settings.importArchive.isPending ||
    settings.exportArchive.isPending
  async function action(work: () => Promise<unknown>, message?: string) {
    setError('')
    setNotice('')
    try {
      await work()
      if (message) setNotice(message)
    } catch (error) {
      setError(error instanceof Error ? error.message : 'The action could not be completed.')
    }
  }
  async function archive(direction: 'import' | 'export') {
    await action(async () => {
      const result = await (direction === 'import'
        ? settings.importArchive.mutateAsync()
        : settings.exportArchive.mutateAsync())
      setNotice(
        result.cancelled
          ? 'File selection cancelled.'
          : `${direction === 'import' ? 'Imported' : 'Exported'} ${result.count} setting${result.count === 1 ? '' : 's'}.`
      )
    })
  }
  return (
    <div className="h-full overflow-auto">
      <div className="mx-auto max-w-6xl space-y-6 px-6 py-8 lg:px-10">
        <header className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">Settings</h1>
            <p className="mt-1 text-sm text-muted-foreground">Application configuration, saved on this device.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => void action(() => conveyor.window.open())}>
              <Plus />
              New window
            </Button>
            <Button variant="outline" onClick={() => void archive('import')} disabled={pending}>
              <Upload />
              Import JSON
            </Button>
            <Button variant="outline" onClick={() => void archive('export')} disabled={pending}>
              <Download />
              Export JSON
            </Button>
          </div>
        </header>
        <p className="text-xs text-muted-foreground">
          Archives support 1,000 settings and 5 MiB. Import merges by key and replaces existing values.
        </p>
        {notice && (
          <p role="status" className="rounded-lg border border-border bg-muted px-4 py-3 text-sm">
            {notice}
          </p>
        )}
        {error && (
          <p role="alert" className="rounded-lg border border-destructive/40 px-4 py-3 text-sm text-destructive">
            {error}
          </p>
        )}
        <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
          <section aria-label="Settings list" className="space-y-4">
            <h2 className="font-medium">Application settings</h2>
            {settings.list.isPending ? (
              <p className="py-10 text-sm text-muted-foreground">Loading settings…</p>
            ) : settings.list.isError ? (
              <div role="alert">
                <p>Settings could not be loaded.</p>
                <Button variant="outline" onClick={() => void settings.list.refetch()}>
                  Retry loading settings
                </Button>
              </div>
            ) : settings.list.data.items.length === 0 ? (
              <div className="rounded-xl border border-dashed border-border px-6 py-12 text-center text-muted-foreground">
                No settings here yet.
              </div>
            ) : (
              <ul className="space-y-3">
                {settings.list.data.items.map((setting) => (
                  <li key={setting.key} className="flex gap-3 rounded-xl border border-border bg-card p-4">
                    <div className="min-w-0 flex-1">
                      <p className="break-words font-mono text-sm font-medium">{setting.key}</p>
                      <p className="mt-1 whitespace-pre-wrap break-words text-sm text-muted-foreground">
                        {setting.value || <em>Empty value</em>}
                      </p>
                    </div>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label={`Edit ${setting.key}`}
                        disabled={pending}
                        onClick={() => {
                          setSelected(setting)
                          setError('')
                          setNotice('')
                        }}
                      >
                        <Pencil />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label={`Delete ${setting.key}`}
                        disabled={pending}
                        onClick={() => setDeleting(setting)}
                      >
                        <Trash2 />
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
            <div className="flex items-center justify-between">
              <Button
                variant="outline"
                disabled={!cursors.length || settings.list.isFetching}
                onClick={() => setCursors((items) => items.slice(0, -1))}
              >
                Previous
              </Button>
              <span className="text-xs text-muted-foreground">Page {cursors.length + 1}</span>
              <Button
                variant="outline"
                disabled={!nextCursor || settings.list.isFetching}
                onClick={() => {
                  if (nextCursor) setCursors((items) => [...items, nextCursor])
                }}
              >
                Next
              </Button>
            </div>
          </section>
          <SettingEditor
            key={selected ? `edit:${selected.key}:${selected.generation}` : 'create'}
            setting={selected}
            onCancel={() => setSelected(undefined)}
            onReload={selected ? () => conveyor.settings.get({ key: selected.key }) : undefined}
            onSave={async (draft) => {
              if (selected) {
                await settings.update.mutateAsync({
                  key: selected.key,
                  expectedVersion: draft.expectedVersion!,
                  expectedGeneration: draft.expectedGeneration!,
                  value: draft.value,
                })
                setSelected(undefined)
                setNotice('Setting updated.')
              } else {
                await settings.create.mutateAsync({ key: draft.key, value: draft.value })
                setNotice('Setting created.')
              }
              setError('')
            }}
          />
        </div>
      </div>
      <AlertDialog.Root
        open={!!deleting}
        onOpenChange={(open) => {
          if (!open) setDeleting(undefined)
        }}
      >
        <AlertDialog.Portal>
          <AlertDialog.Overlay className="fixed inset-0 z-40 bg-black/50" />
          <AlertDialog.Content className="fixed top-1/2 left-1/2 z-50 w-[min(90vw,420px)] -translate-x-1/2 -translate-y-1/2 space-y-4 rounded-xl border border-border bg-background p-6 text-foreground shadow-xl">
            <AlertDialog.Title className="text-lg font-semibold">Delete setting?</AlertDialog.Title>
            <AlertDialog.Description className="text-sm text-muted-foreground">
              Delete “{deleting?.key}”? This cannot be undone.
            </AlertDialog.Description>
            <div className="flex justify-end gap-2">
              <AlertDialog.Cancel asChild>
                <Button variant="outline">Keep setting</Button>
              </AlertDialog.Cancel>
              <AlertDialog.Action asChild>
                <Button
                  variant="destructive"
                  onClick={() => {
                    if (deleting)
                      void action(async () => {
                        await settings.remove.mutateAsync({
                          key: deleting.key,
                          expectedVersion: deleting.version,
                          expectedGeneration: deleting.generation,
                        })
                        if (selected?.key === deleting.key) setSelected(undefined)
                      }, 'Setting deleted.')
                  }}
                >
                  Confirm delete
                </Button>
              </AlertDialog.Action>
            </div>
          </AlertDialog.Content>
        </AlertDialog.Portal>
      </AlertDialog.Root>
    </div>
  )
}
