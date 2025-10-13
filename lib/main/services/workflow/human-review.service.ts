import { DatabaseService } from '../core/database.service'
import { EventBusService } from '../core/event-bus.service'
import { eq, and } from 'drizzle-orm'
import { humanReviews, workflowRuns } from '@/lib/main/db/schema'
import log from 'electron-log/main'

export class HumanReviewService {
  constructor(
    private dbService: DatabaseService,
    private eventBus: EventBusService
  ) {}

  /**
   * Create a review request
   */
  async createReview(
    runId: string,
    reviewType: 'approval' | 'feedback' | 'correction',
    title: string,
    description: string,
    contextData: any
  ) {
    const [review] = await this.dbService.db
      .insert(humanReviews)
      .values({
        workflowRunId: runId,
        reviewType,
        title,
        description,
        status: 'pending',
        contextData: JSON.stringify(contextData),
      })
      .returning()

    // Pause workflow
    await this.dbService.db
      .update(workflowRuns)
      .set({
        status: 'paused',
        pausedAt: new Date(),
        pausedReason: `human_review:${reviewType}`,
      })
      .where(eq(workflowRuns.id, runId))

    this.eventBus.emit('review:created', { reviewId: review.id, runId })
    log.info('Review created:', review.id, 'for run:', runId)

    return review
  }

  /**
   * Submit review decision
   */
  async submitReview(
    reviewId: string,
    decision: 'approved' | 'rejected' | 'needs_revision',
    notes?: string
  ) {
    const [review] = await this.dbService.db
      .update(humanReviews)
      .set({
        status: decision === 'approved' ? 'approved' : 'rejected',
        decision,
        reviewerNotes: notes,
        submittedAt: new Date(),
      })
      .where(eq(humanReviews.id, reviewId))
      .returning()

    if (decision === 'approved') {
      // Resume workflow
      await this.dbService.db
        .update(workflowRuns)
        .set({
          status: 'pending',
          pausedAt: null,
          pausedReason: null,
        })
        .where(eq(workflowRuns.id, review.workflowRunId))

      this.eventBus.emit('review:approved', { reviewId, runId: review.workflowRunId })
      log.info('Review approved:', reviewId)
    } else {
      this.eventBus.emit('review:rejected', {
        reviewId,
        runId: review.workflowRunId,
        notes,
      })
      log.info('Review rejected:', reviewId)
    }

    return review
  }

  /**
   * Get pending reviews
   */
  async getPendingReviews(runId?: string) {
    const query = this.dbService.db.select().from(humanReviews)

    if (runId) {
      return query.where(and(eq(humanReviews.workflowRunId, runId), eq(humanReviews.status, 'pending')))
    }

    return query.where(eq(humanReviews.status, 'pending'))
  }
}
