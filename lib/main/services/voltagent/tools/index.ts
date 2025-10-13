import { fileReaderTool } from './file-reader.tool'
import { documentParserTool } from './document-parser.tool'
import { fileSaverTool } from './file-saver.tool'
import { pdfExtractorTool } from './pdf-extractor.tool'
import { templateLoaderTool } from './template-loader.tool'

// Export individual tools
export { fileReaderTool, documentParserTool, fileSaverTool, pdfExtractorTool, templateLoaderTool }

export const toolRegistry = {
  read_file: fileReaderTool,
  parse_document: documentParserTool,
  save_file: fileSaverTool,
  extract_pdf: pdfExtractorTool,
  load_template: templateLoaderTool,
}

export type ToolName = keyof typeof toolRegistry

// Helper to get tools by category
export const getToolsByCategory = (category: 'file' | 'document' | 'template') => {
  const categoryMap = {
    file: [fileReaderTool, fileSaverTool, pdfExtractorTool],
    document: [documentParserTool],
    template: [templateLoaderTool],
  }
  return categoryMap[category]
}

// Export all tools as array
export const allTools = Object.values(toolRegistry)
