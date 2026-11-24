import { expect, it } from 'vitest'
import { QuitCoordinator } from '../../lib/main/bootstrap/lifecycle'

it('blocks every quit attempt while startup/work drains, runs cleanup once, and admits the final quit', async () => {
  let finish!: () => void
  const pending = new Promise<void>((resolve) => {
    finish = resolve
  })
  let stops = 0,
    quits = 0,
    prevented = 0
  const coordinator = new QuitCoordinator(
    async () => {
      stops++
      await pending
    },
    () => {
      quits++
    }
  )
  const event = {
    preventDefault: () => {
      prevented++
    },
  }
  coordinator.beforeQuit(event)
  coordinator.beforeQuit(event)
  expect(coordinator.isStopping).toBe(true)
  expect(stops).toBe(1)
  expect(quits).toBe(0)
  expect(prevented).toBe(2)
  finish()
  await pending
  await new Promise((resolve) => setImmediate(resolve))
  expect(quits).toBe(1)
  coordinator.beforeQuit(event)
  expect(prevented).toBe(2)
  expect(stops).toBe(1)
})

it('reports failed cleanup and still permits termination', async () => {
  const error = new Error('cleanup failed'),
    errors: unknown[] = []
  let quits = 0,
    prevented = 0
  const coordinator = new QuitCoordinator(
    async () => {
      throw error
    },
    () => {
      quits++
    },
    (error) => errors.push(error)
  )
  coordinator.beforeQuit({
    preventDefault: () => {
      prevented++
    },
  })
  await new Promise((resolve) => setImmediate(resolve))
  expect(errors).toEqual([error])
  expect(quits).toBe(1)
  coordinator.beforeQuit({
    preventDefault: () => {
      prevented++
    },
  })
  expect(prevented).toBe(1)
})
