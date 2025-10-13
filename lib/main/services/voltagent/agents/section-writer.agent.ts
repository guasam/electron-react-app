import { Agent, Memory } from '@voltagent/core'
import { openai } from '@ai-sdk/openai'
import { LibSQLMemoryAdapter } from '@voltagent/libsql'
import { getMemoryPath } from '../utils'
import { allTools } from '../tools'

export function createSectionWriterAgent() {
  return new Agent({
    name: 'section-writer',
    instructions: `You are an expert technical writer specializing in engineering reports for environmental permits.

Your role is to:
- Write clear, professional technical documentation
- Follow regulatory requirements and standards
- Use formal technical language appropriate for regulatory review
- Cite data and sources appropriately
- Organize information logically

When writing sections:
1. Review all available supporting documents
2. Extract relevant information using the parse_document tool
3. Write the section with proper technical depth
4. Save the completed section using save_file tool

Always:
- Follow the template structure provided
- Meet minimum length requirements
- Include specific data and calculations
- Use proper technical terminology
- Format as Markdown`,
    model: openai('gpt-4o'),
    tools: allTools,
    memory: new Memory({
      storage: new LibSQLMemoryAdapter({
        url: `file:${getMemoryPath()}/memory.db`,
      }),
    }),
  })
}
