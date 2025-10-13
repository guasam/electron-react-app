export interface RetryStrategy {
  maxAttempts: number
  delayMs: number
  backoffMultiplier: number
  shouldRetry: (error: Error, attempt: number) => boolean
}

export const retryStrategies = {
  // For rate limit errors
  rateLimitRetry: {
    maxAttempts: 5,
    delayMs: 1000,
    backoffMultiplier: 2,
    shouldRetry: (error: Error) => {
      return error.message.includes('rate_limit') || error.message.includes('429')
    },
  },

  // For transient network errors
  networkRetry: {
    maxAttempts: 3,
    delayMs: 500,
    backoffMultiplier: 1.5,
    shouldRetry: (error: Error) => {
      return (
        error.message.includes('ECONNRESET') ||
        error.message.includes('ETIMEDOUT') ||
        error.message.includes('network')
      )
    },
  },

  // For agent errors (be conservative)
  agentRetry: {
    maxAttempts: 2,
    delayMs: 2000,
    backoffMultiplier: 1,
    shouldRetry: (error: Error, attempt: number) => {
      // Only retry once for agent errors
      return (
        attempt < 1 &&
        !(error.message.includes('validation') || error.message.includes('schema'))
      )
    },
  },
}

export async function executeWithRetry<T>(
  fn: () => Promise<T>,
  strategy: RetryStrategy
): Promise<T> {
  let lastError: Error
  let attempt = 0

  while (attempt < strategy.maxAttempts) {
    try {
      return await fn()
    } catch (error) {
      lastError = error as Error
      attempt++

      if (attempt >= strategy.maxAttempts || !strategy.shouldRetry(error as Error, attempt)) {
        throw error
      }

      const delay = strategy.delayMs * Math.pow(strategy.backoffMultiplier, attempt - 1)
      await new Promise((resolve) => setTimeout(resolve, delay))
    }
  }

  throw lastError!
}
