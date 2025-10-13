import { Agent, Memory } from '@voltagent/core'
import { openai } from '@ai-sdk/openai'
import { LibSQLMemoryAdapter } from '@voltagent/libsql'
import { getMemoryPath } from '../utils'
import { fileReaderTool, fileSaverTool } from '../tools'

export function createDocumentGeneratorAgent() {
  return new Agent({
    name: 'document-generator',
    instructions: `You are a document compilation specialist.

Your role is to:
- Compile multiple sections into a cohesive document
- Ensure consistent formatting and style
- Create table of contents
- Add proper document structure (title page, sections, appendices)
- Ensure all cross-references are accurate

When compiling documents:
1. Read all section files using read_file tool
2. Create a professional document structure
3. Add table of contents with section numbers
4. Ensure consistent formatting throughout
5. Save the final document using save_file tool

Output documents in well-formatted Markdown with:
- Clear heading hierarchy (# ## ### etc.)
- Proper lists and tables
- Page break indicators where appropriate
- Professional layout`,
    model: openai('gpt-4o'),
    tools: [fileReaderTool, fileSaverTool],
    memory: new Memory({
      storage: new LibSQLMemoryAdapter({
        url: `file:${getMemoryPath()}/memory.db`,
      }),
    }),
  })
}
