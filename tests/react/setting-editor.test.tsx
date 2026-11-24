// @vitest-environment jsdom
import React from 'react'
import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import '@testing-library/jest-dom/vitest'
import { SettingEditor } from '../../app/features/settings/setting-editor'

afterEach(cleanup)
describe('setting editor', () => {
  it('validates keys and saves a normalized key without trimming its value', async () => {
    const saved: unknown[] = [],
      user = userEvent.setup()
    render(
      <SettingEditor
        onSave={async (draft) => {
          saved.push(draft)
        }}
      />
    )
    await user.click(screen.getByRole('button', { name: 'Create setting' }))
    expect(screen.getByRole('alert')).toHaveTextContent('key')
    expect(saved).toEqual([])
    await user.type(screen.getByLabelText('Key', { exact: true }), '  app.locale  ')
    await user.type(screen.getByLabelText('Value', { exact: true }), ' en ')
    await user.click(screen.getByRole('button', { name: 'Create setting' }))
    expect(saved).toEqual([{ key: 'app.locale', value: ' en ' }])
    expect(screen.getByLabelText('Key', { exact: true })).toHaveValue('')
  })
  it('keeps the key immutable, preserves a stale value and reloads explicitly', async () => {
    const setting = {
        generation: 'generation',
        key: 'app.locale',
        value: 'en',
        version: 1,
        createdAt: '',
        updatedAt: '',
      },
      user = userEvent.setup()
    render(
      <SettingEditor
        setting={setting}
        onSave={async () => {
          throw Object.assign(new Error('Setting changed in another window.'), { code: 'CONFLICT' })
        }}
        onReload={async () => ({ ...setting, value: 'es', version: 2 })}
      />
    )
    expect(screen.getByLabelText('Key', { exact: true })).toBeDisabled()
    const value = screen.getByLabelText('Value', { exact: true })
    await user.clear(value)
    await user.type(value, 'my draft')
    await user.click(screen.getByRole('button', { name: 'Save changes' }))
    expect(value).toHaveValue('my draft')
    expect(screen.getByRole('alert')).toHaveTextContent('changed in another window')
    await user.click(screen.getByRole('button', { name: 'Reload current setting' }))
    expect(value).toHaveValue('es')
  })
})
