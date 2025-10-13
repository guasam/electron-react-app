import { sqliteTable, text, integer, index, unique } from 'drizzle-orm/sqlite-core'
import { sql } from 'drizzle-orm'
import { relations } from 'drizzle-orm'

// ==========================================
// API Key Management
// ==========================================

export const apiKeys = sqliteTable(
  'ApiKey',
  {
    id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
    provider: text('provider').notNull().default('openai'),
    encryptedKey: text('encryptedKey').notNull(),
    isActive: integer('isActive', { mode: 'boolean' }).notNull().default(true),
    createdAt: integer('createdAt', { mode: 'timestamp' })
      .notNull()
      .$defaultFn(() => new Date()),
    updatedAt: integer('updatedAt', { mode: 'timestamp' })
      .notNull()
      .$defaultFn(() => new Date())
      .$onUpdateFn(() => new Date()),
  },
  (table) => ({
    providerIdx: unique('ApiKey_provider_key').on(table.provider),
  })
)

// ==========================================
// Workflow Definitions
// ==========================================

export const workflowDefinitions = sqliteTable('WorkflowDefinition', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  description: text('description'),
  version: text('version').notNull().default('1.0.0'),
  config: text('config').notNull(),
  schema: text('schema').notNull(),
  isActive: integer('isActive', { mode: 'boolean' }).notNull().default(true),
  createdAt: integer('createdAt', { mode: 'timestamp' })
    .notNull()
    .$defaultFn(() => new Date()),
  updatedAt: integer('updatedAt', { mode: 'timestamp' })
    .notNull()
    .$defaultFn(() => new Date())
    .$onUpdateFn(() => new Date()),
})

// ==========================================
// Workflow Execution
// ==========================================

export const workflowRuns = sqliteTable(
  'WorkflowRun',
  {
    id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
    workflowId: text('workflowId')
      .notNull()
      .references(() => workflowDefinitions.id),
    workflowVersion: text('workflowVersion').notNull(),
    status: text('status').notNull(),
    currentStep: integer('currentStep').notNull().default(0),
    totalSteps: integer('totalSteps').notNull(),
    input: text('input').notNull(),
    output: text('output'),
    error: text('error'),
    executionTimeMs: integer('executionTimeMs'),
    pausedAt: integer('pausedAt', { mode: 'timestamp' }),
    pausedReason: text('pausedReason'),
    resumeData: text('resumeData'),
    createdAt: integer('createdAt', { mode: 'timestamp' })
      .notNull()
      .$defaultFn(() => new Date()),
    startedAt: integer('startedAt', { mode: 'timestamp' }),
    completedAt: integer('completedAt', { mode: 'timestamp' }),
    createdBy: text('createdBy').notNull().default('system'),
  },
  (table) => ({
    workflowIdCreatedAtIdx: index('WorkflowRun_workflowId_createdAt_idx').on(
      table.workflowId,
      table.createdAt
    ),
    statusIdx: index('WorkflowRun_status_idx').on(table.status),
  })
)

// ==========================================
// Workflow Step Tracking
// ==========================================

export const workflowSteps = sqliteTable(
  'WorkflowStep',
  {
    id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
    workflowRunId: text('workflowRunId')
      .notNull()
      .references(() => workflowRuns.id, { onDelete: 'cascade' }),
    stepIndex: integer('stepIndex').notNull(),
    stepName: text('stepName').notNull(),
    stepType: text('stepType').notNull(),
    status: text('status').notNull(),
    input: text('input'),
    output: text('output'),
    error: text('error'),
    executionTimeMs: integer('executionTimeMs'),
    retryCount: integer('retryCount').notNull().default(0),
    maxRetries: integer('maxRetries').notNull().default(3),
    createdAt: integer('createdAt', { mode: 'timestamp' })
      .notNull()
      .$defaultFn(() => new Date()),
    startedAt: integer('startedAt', { mode: 'timestamp' }),
    completedAt: integer('completedAt', { mode: 'timestamp' }),
  },
  (table) => ({
    workflowRunIdStepIndexKey: unique('WorkflowStep_workflowRunId_stepIndex_key').on(
      table.workflowRunId,
      table.stepIndex
    ),
    workflowRunIdStatusIdx: index('WorkflowStep_workflowRunId_status_idx').on(
      table.workflowRunId,
      table.status
    ),
  })
)

// ==========================================
// File Management
// ==========================================

export const files = sqliteTable(
  'File',
  {
    id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
    workflowRunId: text('workflowRunId')
      .notNull()
      .references(() => workflowRuns.id, { onDelete: 'cascade' }),
    filename: text('filename').notNull(),
    originalName: text('originalName').notNull(),
    mimeType: text('mimeType').notNull(),
    size: integer('size').notNull(),
    fileType: text('fileType').notNull(),
    category: text('category').notNull(),
    version: integer('version').notNull().default(1),
    parentFileId: text('parentFileId').references((): any => files.id, { onDelete: 'set null' }),
    localPath: text('localPath').notNull(),
    hash: text('hash'),
    metadata: text('metadata').notNull().default('{}'),
    extractedText: text('extractedText'),
    createdAt: integer('createdAt', { mode: 'timestamp' })
      .notNull()
      .$defaultFn(() => new Date()),
    createdBy: text('createdBy').notNull().default('system'),
  },
  (table) => ({
    workflowRunIdFileTypeIdx: index('File_workflowRunId_fileType_idx').on(
      table.workflowRunId,
      table.fileType
    ),
    hashIdx: index('File_hash_idx').on(table.hash),
  })
)

// ==========================================
// Human-in-the-Loop
// ==========================================

export const humanReviews = sqliteTable(
  'HumanReview',
  {
    id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
    workflowRunId: text('workflowRunId')
      .notNull()
      .references(() => workflowRuns.id, { onDelete: 'cascade' }),
    reviewType: text('reviewType').notNull(),
    title: text('title').notNull(),
    description: text('description'),
    status: text('status').notNull(),
    contextData: text('contextData').notNull().default('{}'),
    reviewerNotes: text('reviewerNotes'),
    decision: text('decision'),
    submittedAt: integer('submittedAt', { mode: 'timestamp' }),
    createdAt: integer('createdAt', { mode: 'timestamp' })
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (table) => ({
    workflowRunIdStatusIdx: index('HumanReview_workflowRunId_status_idx').on(
      table.workflowRunId,
      table.status
    ),
  })
)

// ==========================================
// System Configuration
// ==========================================

export const systemConfigs = sqliteTable('SystemConfig', {
  key: text('key').primaryKey(),
  value: text('value').notNull(),
  updatedAt: integer('updatedAt', { mode: 'timestamp' })
    .notNull()
    .$defaultFn(() => new Date())
    .$onUpdateFn(() => new Date()),
})

// ==========================================
// Relations
// ==========================================

export const workflowDefinitionsRelations = relations(workflowDefinitions, ({ many }) => ({
  runs: many(workflowRuns),
}))

export const workflowRunsRelations = relations(workflowRuns, ({ one, many }) => ({
  workflow: one(workflowDefinitions, {
    fields: [workflowRuns.workflowId],
    references: [workflowDefinitions.id],
  }),
  files: many(files),
  steps: many(workflowSteps),
  reviews: many(humanReviews),
}))

export const workflowStepsRelations = relations(workflowSteps, ({ one }) => ({
  workflowRun: one(workflowRuns, {
    fields: [workflowSteps.workflowRunId],
    references: [workflowRuns.id],
  }),
}))

export const filesRelations = relations(files, ({ one, many }) => ({
  workflowRun: one(workflowRuns, {
    fields: [files.workflowRunId],
    references: [workflowRuns.id],
  }),
  parentFile: one(files, {
    fields: [files.parentFileId],
    references: [files.id],
    relationName: 'fileVersions',
  }),
  versions: many(files, {
    relationName: 'fileVersions',
  }),
}))

export const humanReviewsRelations = relations(humanReviews, ({ one }) => ({
  workflowRun: one(workflowRuns, {
    fields: [humanReviews.workflowRunId],
    references: [workflowRuns.id],
  }),
}))

// ==========================================
// Types
// ==========================================

export type ApiKey = typeof apiKeys.$inferSelect
export type NewApiKey = typeof apiKeys.$inferInsert

export type WorkflowDefinition = typeof workflowDefinitions.$inferSelect
export type NewWorkflowDefinition = typeof workflowDefinitions.$inferInsert

export type WorkflowRun = typeof workflowRuns.$inferSelect
export type NewWorkflowRun = typeof workflowRuns.$inferInsert

export type WorkflowStep = typeof workflowSteps.$inferSelect
export type NewWorkflowStep = typeof workflowSteps.$inferInsert

export type File = typeof files.$inferSelect
export type NewFile = typeof files.$inferInsert

export type HumanReview = typeof humanReviews.$inferSelect
export type NewHumanReview = typeof humanReviews.$inferInsert

export type SystemConfig = typeof systemConfigs.$inferSelect
export type NewSystemConfig = typeof systemConfigs.$inferInsert
