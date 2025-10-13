import { createTool } from '@voltagent/core'
import { z } from 'zod'
import type { WorkflowContext } from '@/lib/main/types/workflow.types'

export const fileReaderTool = createTool({
  name: 'read_file',
  description: 'Read content from an uploaded file by file ID',
  parameters: z.object({
    fileId: z.string().describe('The ID of the file to read'),
  }),
  execute: async ({ fileId }, context: WorkflowContext) => {
    const db = context.db
    const file = await db.prisma.file.findUnique({
      where: { id: fileId },
    })

    if (!file) {
      throw new Error(`File not found: ${fileId}`)
    }

    // Use fileService to read content
    const fileService = context.fileService
    const content = await fileService.readFileAsString(fileId)

    return {
      filename: file.originalName,
      content,
      mimeType: file.mimeType,
      size: file.size,
    }
  },
})
