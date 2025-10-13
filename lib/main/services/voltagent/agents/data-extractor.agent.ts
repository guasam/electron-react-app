import { Agent, Memory } from '@voltagent/core'
import { openai } from '@ai-sdk/openai'
import { LibSQLMemoryAdapter } from '@voltagent/libsql'
import { getMemoryPath } from '../utils'
import { fileReaderTool, pdfExtractorTool, documentParserTool } from '../tools'

export function createDataExtractorAgent() {
  return new Agent({
    name: 'data-extractor',
    instructions: `You are a data extraction specialist.

Your role:
- Extract structured information from unstructured text
- Identify key data points, numbers, dates, entities
- Return information in JSON format
- Handle incomplete or ambiguous data gracefully

When extracting data:
1. Read files using read_file tool
2. Use extract_pdf for PDF documents
3. Use parse_document for pattern-based extraction
4. Analyze and compile extracted information
5. Return as valid JSON

Always:
- Return valid JSON
- Include confidence scores when uncertain
- Note missing fields as null
- Preserve original units and formats
- Be thorough and systematic`,
    model: openai('gpt-4o-mini'), // Faster, cheaper for extraction
    tools: [fileReaderTool, pdfExtractorTool, documentParserTool],
    memory: new Memory({
      storage: new LibSQLMemoryAdapter({
        url: `file:${getMemoryPath()}/memory.db`,
      }),
    }),
  })
}
