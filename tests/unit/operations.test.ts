import { describe, expect, it } from 'vitest'
import { OperationRunner, publicFailure } from '../../lib/main/bootstrap/operations'
import { AppError } from '../../shared/domain/errors'

describe('operation lifecycle', () => {
  it('disposes scopes after both success and failure and sanitizes unexpected errors', async () => {
    let disposals = 0
    const runner = new OperationRunner(
      () => ({
        services: { value: 7 },
        dispose: async () => {
          disposals++
        },
      }),
      () => {}
    )
    expect(await runner.run(undefined, async ({ value }) => value)).toBe(7)
    await expect(
      runner.run(undefined, async () => {
        throw new Error('SQL /private/profile secret')
      })
    ).rejects.toThrow()
    expect(disposals).toBe(2)
    expect(publicFailure(new Error('SQL /private/profile secret'))).toEqual({
      code: 'INTERNAL_ERROR',
      message: 'Something went wrong. Please try again.',
    })
    expect(publicFailure(new AppError('CONFLICT', 'Setting changed.'))).toEqual({
      code: 'CONFLICT',
      message: 'Setting changed.',
    })
  })
  it('keeps a committed result when notification or cleanup fails', async () => {
    const runner = new OperationRunner(
      () => ({
        services: {},
        dispose: async () => {
          throw new Error('cleanup')
        },
      }),
      () => {}
    )
    expect(
      await runner.run(
        undefined,
        async () => 'committed',
        () => {
          throw new Error('closed window')
        }
      )
    ).toBe('committed')
  })
  it('stops admission and waits for in-flight work before shutdown resolves', async () => {
    let finish!: () => void
    const pending = new Promise<void>((resolve) => {
      finish = resolve
    })
    const runner = new OperationRunner(
      () => ({ services: {}, dispose: async () => {} }),
      () => {}
    )
    const work = runner.run(undefined, async () => {
      await pending
      return 9
    })
    let stopped = false
    const stop = runner.shutdown().then(() => {
      stopped = true
    })
    await expect(runner.run(undefined, async () => 0)).rejects.toMatchObject({ code: 'SHUTTING_DOWN' })
    expect(stopped).toBe(false)
    finish()
    expect(await work).toBe(9)
    await stop
    expect(stopped).toBe(true)
  })
})
