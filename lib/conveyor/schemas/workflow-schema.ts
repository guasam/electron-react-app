import { z } from 'zod'

// Helper schemas
const FileSchema = z.object({
  id: z.string(),
  filename: z.string(),
  originalName: z.string(),
  mimeType: z.string(),
  size: z.number(),
  fileType: z.string(),
  category: z.string(),
  createdAt: z.string(),
})

const WorkflowRunSchema = z.object({
  id: z.string(),
  workflowId: z.string(),
  status: z.string(),
  currentStep: z.number(),
  totalSteps: z.number(),
  createdAt: z.string(),
  startedAt: z.string().nullable(),
  completedAt: z.string().nullable(),
  executionTimeMs: z.number().nullable(),
  error: z.string().nullable(),
})

export const workflowIpcSchema = {
  // Workflow management
  'workflow:list-available': {
    args: z.tuple([]),
    return: z.array(
      z.object({
        id: z.string(),
        name: z.string(),
        steps: z.number(),
      })
    ),
  },

  'workflow:create-run': {
    args: z.tuple([
      z.string(), // workflowId
      z.any(), // input data
    ]),
    return: z.object({ runId: z.string() }),
  },

  'workflow:execute': {
    args: z.tuple([z.string()]), // runId
    return: z.any(),
  },

  'workflow:list-runs': {
    args: z.tuple([]),
    return: z.array(WorkflowRunSchema),
  },

  'workflow:get-run': {
    args: z.tuple([z.string()]), // runId
    return: WorkflowRunSchema.extend({
      files: z.array(FileSchema).optional(),
    }),
  },

  // File management
  'file:upload': {
    args: z.tuple([
      z.string(), // runId
      z.string(), // filename
      z.instanceof(Uint8Array), // data
      z.string().optional(), // category
    ]),
    return: z.object({ fileId: z.string() }),
  },

  'file:list': {
    args: z.tuple([z.string()]), // runId
    return: z.array(FileSchema),
  },

  'file:read': {
    args: z.tuple([z.string()]), // fileId
    return: z.instanceof(Uint8Array),
  },

  // API Key management
  'api-key:save': {
    args: z.tuple([z.string()]),
    return: z.boolean(),
  },

  'api-key:exists': {
    args: z.tuple([]),
    return: z.boolean(),
  },

  'api-key:delete': {
    args: z.tuple([]),
    return: z.boolean(),
  },
} as const
