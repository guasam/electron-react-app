import { createTool } from '@voltagent/core'
import { z } from 'zod'
import type { WorkflowContext } from '@/lib/main/types/workflow.types'

export const documentParserTool = createTool({
  name: 'parse_document',
  description: 'Extract structured information from document text using pattern matching',
  parameters: z.object({
    fileId: z.string().describe('File ID to parse'),
    fields: z.record(z.string()).describe('Fields to extract with their descriptions'),
  }),
  execute: async ({ fileId, fields }, context: WorkflowContext) => {
    const db = context.db
    const fileService = context.fileService

    const file = await db.prisma.file.findUnique({
      where: { id: fileId },
    })

    if (!file) throw new Error(`File not found: ${fileId}`)

    let text = file.extractedText
    if (!text) {
      // Read file content
      text = await fileService.readFileAsString(fileId)
    }

    const extracted: Record<string, string> = {}

    // Pattern-based extraction
    for (const [field, description] of Object.entries(fields)) {
      // Try multiple patterns
      const patterns = [
        new RegExp(`${field.replace(/_/g, ' ')}:?\\s*(.+?)(?:\\n|$)`, 'i'),
        new RegExp(`${description}:?\\s*(.+?)(?:\\n|$)`, 'i'),
        new RegExp(`${field}\\s*[=:]\\s*(.+?)(?:\\n|$)`, 'i'),
      ]

      for (const pattern of patterns) {
        const match = text.match(pattern)
        if (match) {
          extracted[field] = match[1].trim()
          break
        }
      }
    }

    return {
      fields: extracted,
      confidence: 'medium',
      source: file.originalName,
      extractedCount: Object.keys(extracted).length,
      requestedCount: Object.keys(fields).length,
    }
  },
})
