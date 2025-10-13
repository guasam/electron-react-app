import { DatabaseService } from '../core/database.service'
import { EventBusService } from '../core/event-bus.service'
import { eq, gte, asc, and } from 'drizzle-orm'
import { workflowRuns, workflowSteps } from '@/lib/main/db/schema'
import log from 'electron-log/main'

export class WorkflowRecoveryService {
  constructor(
    private dbService: DatabaseService,
    private eventBus: EventBusService
  ) {}

  /**
   * Resume failed workflow from last successful step
   */
  async recoverWorkflow(runId: string) {
    const run = await this.dbService.db
      .select()
      .from(workflowRuns)
      .where(eq(workflowRuns.id, runId))
      .limit(1)
      .then((rows) => rows[0])

    if (!run) throw new Error('Workflow run not found')

    // Get all steps for this run
    const steps = await this.dbService.db
      .select()
      .from(workflowSteps)
      .where(eq(workflowSteps.workflowRunId, runId))
      .orderBy(asc(workflowSteps.stepIndex))

    // Find last successful step
    const lastSuccess = steps.reverse().find((step) => step.status === 'completed')

    const resumeFromStep = lastSuccess ? lastSuccess.stepIndex + 1 : 0

    // Reset run status
    await this.dbService.db
      .update(workflowRuns)
      .set({
        status: 'pending',
        currentStep: resumeFromStep,
        error: null,
      })
      .where(eq(workflowRuns.id, runId))

    // Reset failed steps (only those from resumeFromStep onwards)
    await this.dbService.db
      .update(workflowSteps)
      .set({
        status: 'pending',
        error: null,
      })
      .where(
        and(
          eq(workflowSteps.workflowRunId, runId),
          gte(workflowSteps.stepIndex, resumeFromStep)
        )
      )

    this.eventBus.emit('workflow:recovered', { runId, resumeFromStep })
    log.info('Workflow recovered:', runId, 'from step:', resumeFromStep)

    return { runId, resumeFromStep }
  }

  /**
   * Get recovery suggestions based on error
   */
  async getRecoverySuggestions(runId: string) {
    const run = await this.dbService.db
      .select()
      .from(workflowRuns)
      .where(eq(workflowRuns.id, runId))
      .limit(1)
      .then((rows) => rows[0])

    if (!run) throw new Error('Workflow run not found')

    // Get failed steps
    const failedSteps = await this.dbService.db
      .select()
      .from(workflowSteps)
      .where(eq(workflowSteps.workflowRunId, runId))

    const suggestions = []

    for (const step of failedSteps.filter((s) => s.status === 'failed')) {
      if (step.error?.includes('rate_limit')) {
        suggestions.push({
          step: step.stepIndex,
          issue: 'Rate limit exceeded',
          suggestion: 'Wait a few minutes and retry',
          autoRecoverable: true,
        })
      } else if (step.error?.includes('file')) {
        suggestions.push({
          step: step.stepIndex,
          issue: 'File processing error',
          suggestion: 'Check uploaded files are valid and try again',
          autoRecoverable: false,
        })
      } else {
        suggestions.push({
          step: step.stepIndex,
          issue: step.error || 'Unknown error',
          suggestion: 'Review error logs and contact support if needed',
          autoRecoverable: false,
        })
      }
    }

    return suggestions
  }
}
