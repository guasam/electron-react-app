import { AppError } from '../../../shared/domain/errors'

export function publicFailure(error: unknown): { code: string; message: string; field?: string } {
  if (error instanceof AppError)
    return { code: error.code, message: error.message, ...(error.field ? { field: error.field } : {}) }
  return { code: 'INTERNAL_ERROR', message: 'Something went wrong. Please try again.' }
}
export class OperationRunner<Services, Context> {
  private stopping = false
  private readonly active = new Set<Promise<unknown>>()
  constructor(
    private readonly createScope: (
      context: Context
    ) => { services: Services; dispose(): Promise<void> } | Promise<{ services: Services; dispose(): Promise<void> }>,
    private readonly report: (error: unknown) => void = console.error
  ) {}
  async run<T>(
    context: Context,
    work: (services: Services) => Promise<T>,
    afterCommit?: (result: T) => void
  ): Promise<T> {
    if (this.stopping)
      throw new AppError('SHUTTING_DOWN', 'The application is closing. Please try again after reopening.')
    const operation = (async () => {
      const scope = await this.createScope(context)
      try {
        const result = await work(scope.services)
        try {
          afterCommit?.(result)
        } catch (error) {
          this.report(error)
        }
        return result
      } finally {
        try {
          await scope.dispose()
        } catch (error) {
          this.report(error)
        }
      }
    })()
    this.active.add(operation)
    try {
      return await operation
    } finally {
      this.active.delete(operation)
    }
  }
  async shutdown() {
    this.stopping = true
    await Promise.allSettled([...this.active])
  }
}
