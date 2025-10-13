import { createTool } from '@voltagent/core'
import { z } from 'zod'
import type { WorkflowContext } from '@/lib/main/types/workflow.types'

export const fileSaverTool = createTool({
  name: 'save_file',
  description: 'Save generated content as a file',
  parameters: z.object({
    content: z.string().describe('Content to save'),
    filename: z.string().describe('Filename (e.g., executive-summary.md)'),
    category: z.string().optional().describe('File category'),
  }),
  execute: async ({ content, filename, category }, context: WorkflowContext) => {
    const fileService = context.fileService
    const workflowRunId = context.workflowRunId

    // Validate filename (prevent path traversal)
    if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
      throw new Error('Invalid filename: path traversal not allowed')
    }

    // Size limit (10MB)
    if (Buffer.byteLength(content, 'utf-8') > 10 * 1024 * 1024) {
      throw new Error('Content too large (max 10MB)')
    }

    const file = await fileService.saveGenerated(
      workflowRunId,
      content,
      filename,
      category || 'generated'
    )

    return {
      fileId: file.id,
      filename: file.filename,
      path: file.localPath,
      size: file.size,
    }
  },
})
