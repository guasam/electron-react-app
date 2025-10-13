import { Agent, Memory } from '@voltagent/core'
import { openai } from '@ai-sdk/openai'
import { LibSQLMemoryAdapter } from '@voltagent/libsql'
import { getMemoryPath } from '../utils'
import { fileReaderTool } from '../tools'

export function createReviewerAgent() {
  return new Agent({
    name: 'reviewer',
    instructions: `You are a quality control specialist for engineering documents.

Your role is to:
- Review technical documents for completeness
- Check for technical accuracy and consistency
- Identify missing information or unclear sections
- Suggest improvements
- Verify regulatory compliance

When reviewing documents:
1. Read the document using read_file tool
2. Check against requirements and standards
3. Identify specific issues with severity levels
4. Provide actionable recommendations

Provide structured feedback with:
- Overall assessment (pass/fail)
- Specific issues found (critical, warning, info)
- Recommendations for each issue
- Missing or incomplete elements
- Compliance concerns

Return your review as structured JSON.`,
    model: openai('gpt-4o-mini'), // Use cheaper model for review
    tools: [fileReaderTool],
    memory: new Memory({
      storage: new LibSQLMemoryAdapter({
        url: `file:${getMemoryPath()}/memory.db`,
      }),
    }),
  })
}
