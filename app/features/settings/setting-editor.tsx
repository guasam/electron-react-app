import { useState, type FormEvent } from 'react'
import type { SettingDto, CreateSettingInput } from '@/modules/settings/contracts/settings'
import { createSettingSchema } from '@/modules/settings/contracts/settings'
import { Button } from '@/app/components/ui/button'
import { Input } from '@/app/components/ui/input'
import { Textarea } from '@/app/components/ui/textarea'

type Draft = CreateSettingInput & { expectedVersion?: number; expectedGeneration?: string }
export function SettingEditor({
  setting,
  onSave,
  onCancel,
  onReload,
}: {
  setting?: SettingDto
  onSave: (draft: Draft) => Promise<void>
  onCancel?: () => void
  onReload?: () => Promise<SettingDto>
}) {
  const [key, setKey] = useState(setting?.key ?? ''),
    [value, setValue] = useState(setting?.value ?? '')
  const [generation, setGeneration] = useState(setting?.generation)
  const [version, setVersion] = useState(setting?.version),
    [saving, setSaving] = useState(false)
  const [error, setError] = useState<{ message: string; code?: string } | null>(null)
  async function submit(event: FormEvent) {
    event.preventDefault()
    const parsed = createSettingSchema.safeParse({ key, value })
    if (!parsed.success) {
      setError({ message: parsed.error.issues[0]?.message ?? 'Check the setting.' })
      return
    }
    setSaving(true)
    setError(null)
    try {
      await onSave({ ...parsed.data, ...(version ? { expectedVersion: version, expectedGeneration: generation } : {}) })
      if (!setting) {
        setKey('')
        setValue('')
      }
    } catch (cause) {
      setError({
        message: cause instanceof Error ? cause.message : 'The setting could not be saved.',
        code: typeof cause === 'object' && cause && 'code' in cause ? String(cause.code) : undefined,
      })
    } finally {
      setSaving(false)
    }
  }
  async function reload() {
    if (!onReload) return
    setSaving(true)
    try {
      const current = await onReload()
      setKey(current.key)
      setValue(current.value)
      setVersion(current.version)
      setGeneration(current.generation)
      setError(null)
    } catch (cause) {
      setError({ message: cause instanceof Error ? cause.message : 'The setting could not be loaded.' })
    } finally {
      setSaving(false)
    }
  }
  return (
    <form
      onSubmit={(event) => void submit(event)}
      className="space-y-4 rounded-xl border border-border bg-card p-5"
      aria-label={setting ? 'Edit setting' : 'New setting'}
    >
      <h2 className="font-medium">{setting ? 'Edit setting' : 'New setting'}</h2>
      <div className="space-y-2">
        <label htmlFor="setting-key" className="text-sm font-medium">
          Key
        </label>
        <Input
          id="setting-key"
          value={key}
          onChange={(event) => setKey(event.target.value)}
          disabled={saving || !!setting}
          placeholder="app.locale"
          autoComplete="off"
          maxLength={100}
        />
        <p className="text-xs text-muted-foreground">
          Letters, digits, dots, underscores and hyphens. Keys cannot be renamed.
        </p>
      </div>
      <div className="space-y-2">
        <label htmlFor="setting-value" className="text-sm font-medium">
          Value
        </label>
        <Textarea
          id="setting-value"
          value={value}
          onChange={(event) => setValue(event.target.value)}
          disabled={saving}
          placeholder="en"
          maxLength={5000}
          rows={5}
        />
        <p className="text-xs text-muted-foreground">Stored as text, including whitespace. Up to 5,000 characters.</p>
      </div>
      {error && (
        <div role="alert" className="space-y-2 text-sm text-destructive">
          <p>{error.message}</p>
          {error.code === 'CONFLICT' && onReload && (
            <Button type="button" variant="outline" disabled={saving} onClick={() => void reload()}>
              Reload current setting
            </Button>
          )}
        </div>
      )}
      <div className="flex gap-2">
        <Button type="submit" disabled={saving}>
          {saving ? 'Saving…' : setting ? 'Save changes' : 'Create setting'}
        </Button>
        {setting && (
          <Button type="button" variant="outline" disabled={saving} onClick={onCancel}>
            Cancel editing
          </Button>
        )}
      </div>
    </form>
  )
}
