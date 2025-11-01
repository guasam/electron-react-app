import { handle } from '@/lib/main/shared'
import { promises as fs, Dirent } from 'fs'
import path from 'path'

type SearchParams = {
  tagName: string
  id?: string
  className?: string
  componentName?: string
  textContent?: string
}

type MatchCandidate = {
  absolutePath: string
  relativePath: string
  content: string
}

const IGNORED_DIRECTORIES = new Set([
  'node_modules',
  '.git',
  'dist',
  'build',
  '.next',
  '.turbo',
  '.cache',
  '.expo',
  'coverage',
])

const SUPPORTED_EXTENSIONS = new Set(['.tsx', '.ts', '.jsx', '.js', '.mjs', '.cjs', '.html'])

const MAX_FILE_SIZE_BYTES = 512 * 1024 // 512KB safety guard

const normalizeText = (value: string | undefined) => value?.trim().toLowerCase() ?? ''

async function collectCandidateFiles(root: string): Promise<MatchCandidate[]> {
  const stack: string[] = [root]
  const candidates: MatchCandidate[] = []

  while (stack.length > 0) {
    const currentDir = stack.pop()
    if (!currentDir) continue

    let entries: Dirent[]
    try {
      entries = await fs.readdir(currentDir, { withFileTypes: true })
    } catch {
      continue
    }

    for (const entry of entries) {
      const absolutePath = path.join(currentDir, entry.name)

      if (entry.isDirectory()) {
        if (!IGNORED_DIRECTORIES.has(entry.name) && !entry.name.startsWith('.')) {
          stack.push(absolutePath)
        }
        continue
      }

      if (entry.name.startsWith('.')) continue

      const ext = path.extname(entry.name)
      if (!SUPPORTED_EXTENSIONS.has(ext)) continue

      let stats
      try {
        stats = await fs.stat(absolutePath)
      } catch {
        continue
      }

      if (stats.size > MAX_FILE_SIZE_BYTES) continue

      try {
        const content = await fs.readFile(absolutePath, 'utf-8')
        candidates.push({
          absolutePath,
          relativePath: path.relative(root, absolutePath),
          content,
        })
      } catch {
        continue
      }
    }
  }

  return candidates
}

function scoreCandidate(params: SearchParams, candidate: MatchCandidate) {
  const { content } = candidate
  const lines = content.split(/\r?\n/)
  let score = 0

  const lowerContent = content.toLowerCase()
  if (params.componentName) {
    const componentRegex = new RegExp(`(function|const|class|export\\s+(default\\s+)?(function|const|class)?)\\s+${params.componentName}`, 'i')
    if (componentRegex.test(content)) score += 120
  }

  if (params.tagName) {
    const tagRegex = new RegExp(`<${params.tagName}[\\s>]`, 'i')
    if (tagRegex.test(content)) score += 80
  }

  if (params.id) {
    const idRegex = new RegExp(`id=["']${params.id}["']`, 'i')
    if (idRegex.test(content)) score += 100
  }

  if (params.className) {
    const classes = params.className.split(/\s+/).filter(Boolean)
    classes.forEach(cls => {
      const classRegex = new RegExp(`className=["'][^"']*${cls}[^"']*["']`, 'i')
      if (classRegex.test(content)) score += 40
    })
  }

  if (params.textContent) {
    const normalized = normalizeText(params.textContent)
    if (normalized.length > 0 && lowerContent.includes(normalized)) {
      score += 30
    }
  }

  if (score === 0) return { score: 0, lineNumber: 1, preview: '' }

  let bestLine = 0
  let bestLineScore = 0

  lines.forEach((line, index) => {
    let lineScore = 0
    if (params.tagName && new RegExp(`<${params.tagName}[\\s>]`, 'i').test(line)) lineScore += 50
    if (params.id && new RegExp(params.id, 'i').test(line)) lineScore += 40
    if (params.className && new RegExp(params.className.split(/\s+/)[0], 'i').test(line)) lineScore += 30
    if (params.componentName && new RegExp(params.componentName, 'i').test(line)) lineScore += 20
    if (params.textContent && line.toLowerCase().includes(normalizeText(params.textContent))) lineScore += 10

    if (lineScore > bestLineScore) {
      bestLineScore = lineScore
      bestLine = index
    }
  })

  const preview = lines[bestLine]?.trim().slice(0, 160) ?? ''

  return {
    score: score + bestLineScore,
    lineNumber: bestLine + 1,
    preview,
  }
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
  handle('inspector-search-element', async (params: SearchParams, workspacePath: string) => {
    const candidates = await collectCandidateFiles(workspacePath)

    const matches = candidates
      .map(candidate => {
        const { score, lineNumber, preview } = scoreCandidate(params, candidate)
        return {
          score,
          lineNumber,
          preview,
          relativePath: candidate.relativePath,
          absolutePath: candidate.absolutePath,
        }
      })
      .filter(candidate => candidate.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 10)

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
    const absolutePath = path.join(workspacePath, relativePath)
    const content = await fs.readFile(absolutePath, 'utf-8')
    const block = extractCodeBlock(content, lineNumber)

    return {
      code: block.code,
      startLine: block.startLine,
      endLine: block.endLine,
      absolutePath,
    }
  })
}

