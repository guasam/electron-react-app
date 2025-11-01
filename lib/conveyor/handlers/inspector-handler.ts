import { handle } from '@/lib/main/shared'
import { promises as fs } from 'fs'
import path from 'path'
import { getWorkspaceIndex, type InspectorSearchParams } from '@/lib/conveyor/handlers/inspector-index'

function sanitizeRelativePath(relativePath: string) {
  const normalized = path.normalize(relativePath)
  const segments = normalized.split(path.sep).filter(segment => segment && segment !== '.' && segment !== '..')
  return segments.join(path.sep)
}

function extractCodeBlock(content: string, centerLine: number) {
  const lines = content.split(/\r?\n/)
  const zeroIndex = Math.max(0, centerLine - 1)

  let start = Math.max(0, zeroIndex - 40)
  for (let i = zeroIndex; i >= 0; i -= 1) {
    if (/^(export\s+)?(default\s+)?(function|const|class|interface)\s+\w+/.test(lines[i])) {
      start = i
      break
    }
    if (/^\s*<\w/.test(lines[i])) {
      start = Math.max(0, i - 2)
      break
    }
  }

  let end = Math.min(lines.length, zeroIndex + 60)
  for (let i = zeroIndex; i < lines.length; i += 1) {
    if (/^\s*}\)?;?\s*$/.test(lines[i]) && i > zeroIndex) {
      end = Math.min(lines.length, i + 1)
      break
    }
  }

  return {
    code: lines.slice(start, end).join('\n'),
    startLine: start + 1,
    endLine: end,
  }
}

export const registerInspectorHandlers = () => {
  handle('inspector-search-element', async (params: InspectorSearchParams, workspacePath: string) => {
    const index = await getWorkspaceIndex(workspacePath)
    const matches = await index.search(params)

    return {
      matches: matches.map(({ relativePath, lineNumber, preview, score }) => ({
        relativePath,
        lineNumber,
        preview,
        score,
      })),
    }
  })

  handle('inspector-get-element-code', async (workspacePath: string, relativePath: string, lineNumber: number) => {
    const index = await getWorkspaceIndex(workspacePath)
    const indexedFile = await index.getFile(relativePath)
    const safeRelativePath = indexedFile?.relativePath ?? sanitizeRelativePath(relativePath)
    const absolutePath = path.join(workspacePath, safeRelativePath)

    let content = indexedFile?.content
    if (!content) {
      content = await fs.readFile(absolutePath, 'utf-8')
    }

    const block = extractCodeBlock(content, lineNumber)

    return {
      code: block.code,
      startLine: block.startLine,
      endLine: block.endLine,
      absolutePath,
    }
  })
}

