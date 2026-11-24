import { expect, it } from 'vitest'
import { cancellableChoice } from '../../lib/main/infrastructure/native-archive-chooser'

it('cancels an outstanding native choice and consumes a late dialog failure', async () => {
  const controller = new AbortController()
  let reject!: (error: Error) => void
  const native = new Promise<string>((_resolve, fail) => {
    reject = fail
  })
  const choice = cancellableChoice(controller.signal, () => native)
  await Promise.resolve()
  controller.abort()
  expect(await choice).toBeNull()
  reject(new Error('Dialog owner destroyed'))
  await Promise.resolve()
})

it('does not open a dialog for an already closed caller and returns a successful choice', async () => {
  const controller = new AbortController()
  controller.abort()
  expect(
    await cancellableChoice(controller.signal, () => {
      throw new Error('must not open')
    })
  ).toBeNull()
  expect(await cancellableChoice(new AbortController().signal, async () => 'settings.json')).toBe('settings.json')
})
