import { createTool } from '@voltagent/core'
import { z } from 'zod'
import pdfParse from 'pdf-parse'
import type { WorkflowContext } from '@/lib/main/types/workflow.types'

export const pdfExtractorTool = createTool({
  name: 'extract_pdf',
  description: 'Extract text content from PDF files with page metadata',
  parameters: z.object({
    fileId: z.string().describe('File ID to extract from'),
    pages: z.array(z.number()).optional().describe('Specific pages to extract (1-indexed)'),
  }),
  execute: async ({ fileId, pages }, context: WorkflowContext) => {
    const db = context.db
    const fileService = context.fileService

    const file = await db.prisma.file.findUnique({
      where: { id: fileId },
    })

    if (!file) throw new Error(`File not found: ${fileId}`)
    if (file.mimeType !== 'application/pdf') {
      throw new Error(`File is not a PDF: ${file.mimeType}`)
    }

    const buffer = await fileService.readFile(fileId)
    const data = await pdfParse(buffer)

    // Filter pages if specified
    let text = data.text
    if (pages && pages.length > 0) {
      // Simple page extraction
      const pageTexts = data.text.split('\f') // Form feed = page break
      text = pages.map((p) => pageTexts[p - 1] || '').join('\n\n')
    }

    // Cache extracted text
    await db.prisma.file.update({
      where: { id: fileId },
      data: { extractedText: text },
    })

    return {
      text,
      pages: data.numpages,
      metadata: {
        title: data.info?.Title,
        author: data.info?.Author,
        creator: data.info?.Creator,
      },
    }
  },
})
