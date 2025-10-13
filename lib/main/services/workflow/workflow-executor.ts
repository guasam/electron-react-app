import { VoltAgentService } from '../voltagent'
import { DatabaseService } from '../core/database.service'
import { EventBusService } from '../core/event-bus.service'
import { executeWithRetry, retryStrategies } from '@/lib/main/lib/errors/retry-strategies'
import { eq } from 'drizzle-orm'
import { workflowRuns } from '@/lib/main/db/schema'
import log from 'electron-log/main'
import type { WorkflowId } from '../voltagent/workflows'

export class WorkflowExecutor {
  constructor(
    private voltAgent: VoltAgentService,
    private dbService: DatabaseService,
    private eventBus: EventBusService
  ) {}

  async execute(runId: string) {
    const run = await this.dbService.db
      .select()
      .from(workflowRuns)
      .where(eq(workflowRuns.id, runId))
      .limit(1)
      .then((rows) => rows[0])

    if (!run) throw new Error('Workflow run not found')

    try {
      // Update status
      await this.dbService.db
        .update(workflowRuns)
        .set({ status: 'running', startedAt: new Date() })
        .where(eq(workflowRuns.id, runId))

      this.eventBus.emit('workflow:started', { runId })
      log.info('Workflow started:', runId)

      const startTime = Date.now()

      // Parse input
      const input = JSON.parse(run.input)

      // Execute workflow with retry on rate limits
      const result = await executeWithRetry(
        () => this.voltAgent.executeWorkflow(run.workflowId as WorkflowId, runId, input),
        retryStrategies.rateLimitRetry
      )

      const executionTime = Date.now() - startTime

      // Success
      await this.dbService.db
        .update(workflowRuns)
        .set({
          status: 'completed',
          output: JSON.stringify(result),
          executionTimeMs: executionTime,
          completedAt: new Date(),
        })
        .where(eq(workflowRuns.id, runId))

      this.eventBus.emit('workflow:completed', { runId, result, executionTime })
      log.info('Workflow completed:', runId, `in ${executionTime}ms`)

      return result
    } catch (error: any) {
      // Handle error
      await this.dbService.db
        .update(workflowRuns)
        .set({
          status: 'failed',
          error: error.message,
        })
        .where(eq(workflowRuns.id, runId))

      this.eventBus.emit('workflow:failed', { runId, error: error.message })
      log.error('Workflow failed:', runId, error)

      throw error
    }
  }
}
