import path from 'path'
import { promises as fs } from 'fs'
import type { Dirent, Stats } from 'fs'
import chokidar from 'chokidar'

export type InspectorSearchParams = {
  tagName: string
  id?: string
  className?: string
  componentName?: string
  textContent?: string
}

type IndexedFileMetadata = {
  componentNames: Set<string>
  ids: Set<string>
  classNames: Set<string>
  dataComponents: Set<string>
  tagNames: Set<string>
}

type IndexedFile = {
  absolutePath: string
  relativePath: string
  size: number
  content: string
  lowerContent: string
  lines: string[]
  metadata: IndexedFileMetadata
  mtimeMs: number
}

type NormalizedSearchParams = {
  tagName?: string
  id?: string
  classTokens: string[]
  componentName?: string
  textContent?: string
}

export type SearchMatch = {
  relativePath: string
  absolutePath: string
  lineNumber: number
  preview: string
  score: number
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

const MAX_FILE_SIZE_BYTES = 512 * 1024

const workspaceIndexes = new Map<string, WorkspaceIndex>()

export async function getWorkspaceIndex(root: string): Promise<WorkspaceIndex> {
  const normalizedRoot = path.resolve(root)
  let index = workspaceIndexes.get(normalizedRoot)
  if (!index) {
    index = new WorkspaceIndex(normalizedRoot)
    workspaceIndexes.set(normalizedRoot, index)
  }
  await index.ready
  return index
}

class WorkspaceIndex {
  readonly root: string
  private readonly files = new Map<string, IndexedFile>()
  readonly ready: Promise<void>
  private watcher?: chokidar.FSWatcher

  constructor(root: string) {
    this.root = root
    this.ready = this.initialize()
  }

  async search(params: InspectorSearchParams): Promise<SearchMatch[]> {
    await this.ready
    const normalized = normalizeSearchParams(params)
    const matches: SearchMatch[] = []

    for (const file of this.files.values()) {
      const { score, lineNumber, preview } = scoreFile(file, normalized)
      if (score > 0) {
        matches.push({
          relativePath: file.relativePath,
          absolutePath: file.absolutePath,
          lineNumber,
          preview,
          score,
        })
      }
    }

    matches.sort((a, b) => b.score - a.score)
    return matches.slice(0, 10)
  }

  async getFile(relativePath: string): Promise<IndexedFile | undefined> {
    await this.ready
    const normalizedRelative = normalizeRelativePath(relativePath)
    if (!normalizedRelative) return undefined

    let file = this.files.get(normalizedRelative)
    if (file) return file

    const absolutePath = path.join(this.root, normalizedRelative)
    await this.indexFile(absolutePath)
    file = this.files.get(normalizedRelative)
    return file
  }

  private async initialize() {
    try {
      await this.buildInitialIndex()
    } catch (error) {
      console.error(`Failed to build inspector index for ${this.root}`, error)
    } finally {
      this.startWatcher()
    }
  }

  private async buildInitialIndex() {
    const stack: string[] = [this.root]

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
          if (this.shouldDescendDirectory(entry.name)) {
            stack.push(absolutePath)
          }
          continue
        }

        await this.indexFile(absolutePath)
      }
    }
  }

  private shouldDescendDirectory(name: string) {
    if (name.startsWith('.')) return false
    return !IGNORED_DIRECTORIES.has(name)
  }

  private isIgnoredPath(targetPath: string) {
    const absolutePath = path.isAbsolute(targetPath) ? targetPath : path.join(this.root, targetPath)
    const relativePath = path.relative(this.root, absolutePath)
    if (!relativePath || relativePath.length === 0) return false
    if (relativePath.startsWith('..')) return true

    const parts = relativePath.split(path.sep)
    for (const part of parts) {
      if (!part || part === '.') continue
      if (part.startsWith('.')) return true
      if (IGNORED_DIRECTORIES.has(part)) return true
    }
    return false
  }

  private shouldIndexFile(absolutePath: string, stats: Stats) {
    if (!stats.isFile()) return false
    if (stats.size > MAX_FILE_SIZE_BYTES) return false

    const ext = path.extname(absolutePath).toLowerCase()
    if (!SUPPORTED_EXTENSIONS.has(ext)) return false

    const relativePath = path.relative(this.root, absolutePath)
    if (relativePath.startsWith('..')) return false

    const segments = relativePath.split(path.sep)
    for (const segment of segments) {
      if (!segment || segment === '.') continue
      if (segment.startsWith('.')) return false
      if (IGNORED_DIRECTORIES.has(segment)) return false
    }

    return true
  }

  private async indexFile(absolutePath: string) {
    const normalizedAbsolute = path.resolve(absolutePath)

    let stats: Stats
    try {
      stats = await fs.stat(normalizedAbsolute)
    } catch {
      this.removeIndexedFile(normalizedAbsolute)
      return
    }

    if (!this.shouldIndexFile(normalizedAbsolute, stats)) {
      this.removeIndexedFile(normalizedAbsolute)
      return
    }

    let content: string
    try {
      content = await fs.readFile(normalizedAbsolute, 'utf-8')
    } catch (error) {
      console.error(`Failed to read file for indexing: ${normalizedAbsolute}`, error)
      return
    }

    const relativePath = path.relative(this.root, normalizedAbsolute)
    const normalizedRelative = normalizeRelativePath(relativePath)
    if (!normalizedRelative) return

    const metadata = extractFileMetadata(content)
    const lowerContent = content.toLowerCase()
    const lines = content.split(/\r?\n/)

    this.files.set(normalizedRelative, {
      absolutePath: normalizedAbsolute,
      relativePath: normalizedRelative,
      size: stats.size,
      content,
      lowerContent,
      lines,
      metadata,
      mtimeMs: stats.mtimeMs,
    })
  }

  private removeIndexedFile(absolutePath: string) {
    const normalizedRelative = normalizeRelativePath(path.relative(this.root, path.resolve(absolutePath)))
    if (!normalizedRelative) return
    this.files.delete(normalizedRelative)
  }

  private startWatcher() {
    this.watcher = chokidar.watch(this.root, {
      ignored: (watchPath) => this.isIgnoredPath(watchPath),
      ignoreInitial: true,
      persistent: true,
      awaitWriteFinish: {
        stabilityThreshold: 150,
        pollInterval: 25,
      },
    })

    this.watcher
      .on('add', (filePath) => {
        this.indexFile(filePath).catch((error) => {
          console.error(`Failed to index added file: ${filePath}`, error)
        })
      })
      .on('change', (filePath) => {
        this.indexFile(filePath).catch((error) => {
          console.error(`Failed to reindex changed file: ${filePath}`, error)
        })
      })
      .on('unlink', (filePath) => {
        this.removeIndexedFile(filePath)
      })
      .on('error', (error) => {
        console.error('Inspector index watcher error', error)
      })
  }
}

function normalizeRelativePath(relativePath: string) {
  if (!relativePath) return ''
  const normalized = path.normalize(relativePath)
  const segments = normalized.split(path.sep).filter((segment) => segment && segment !== '.' && segment !== '..')
  return segments.join(path.sep)
}

function normalizeSearchParams(params: InspectorSearchParams): NormalizedSearchParams {
  const tagName = params.tagName?.trim().toLowerCase()
  const id = params.id?.trim().toLowerCase()
  const componentName = params.componentName?.trim().toLowerCase()
  const textContent = normalizeText(params.textContent)
  const classTokens = splitClassTokens(params.className)

  return {
    tagName: tagName && tagName.length > 0 ? tagName : undefined,
    id: id && id.length > 0 ? id : undefined,
    componentName: componentName && componentName.length > 0 ? componentName : undefined,
    textContent: textContent && textContent.length > 0 ? textContent : undefined,
    classTokens,
  }
}

function splitClassTokens(className?: string) {
  if (!className) return []
  const tokens = className
    .split(/\s+/)
    .map((token) => token.trim().toLowerCase())
    .filter(Boolean)
  return Array.from(new Set(tokens))
}

function normalizeText(value?: string) {
  return value?.trim().toLowerCase() ?? ''
}

function extractFileMetadata(content: string): IndexedFileMetadata {
  const metadata: IndexedFileMetadata = {
    componentNames: new Set<string>(),
    ids: new Set<string>(),
    classNames: new Set<string>(),
    dataComponents: new Set<string>(),
    tagNames: new Set<string>(),
  }

  for (const match of content.matchAll(/function\s+([A-Z][A-Za-z0-9_]*)\s*\(/g)) {
    metadata.componentNames.add(match[1].toLowerCase())
  }

  for (const match of content.matchAll(/const\s+([A-Z][A-Za-z0-9_]*)\s*=\s*(?:async\s*)?\(/g)) {
    metadata.componentNames.add(match[1].toLowerCase())
  }

  for (const match of content.matchAll(/const\s+([A-Z][A-Za-z0-9_]*)\s*=\s*(?:React\.)?(?:memo|forwardRef)\s*\(/g)) {
    metadata.componentNames.add(match[1].toLowerCase())
  }

  for (const match of content.matchAll(/class\s+([A-Z][A-Za-z0-9_]*)\s+/g)) {
    metadata.componentNames.add(match[1].toLowerCase())
  }

  for (const match of content.matchAll(/export\s+default\s+class\s+([A-Z][A-Za-z0-9_]*)/g)) {
    metadata.componentNames.add(match[1].toLowerCase())
  }

  for (const match of content.matchAll(/export\s+default\s+function\s+([A-Z][A-Za-z0-9_]*)/g)) {
    metadata.componentNames.add(match[1].toLowerCase())
  }

  for (const match of content.matchAll(/id\s*=\s*["']([^"']+)["']/gi)) {
    metadata.ids.add(match[1].trim().toLowerCase())
  }

  for (const match of content.matchAll(/data-component\s*=\s*["']([^"']+)["']/gi)) {
    metadata.dataComponents.add(match[1].trim().toLowerCase())
  }

  for (const match of content.matchAll(/class(?:Name)?\s*=\s*["']([^"']+)["']/gi)) {
    match[1]
      .split(/\s+/)
      .map((token) => token.trim().toLowerCase())
      .filter(Boolean)
      .forEach((token) => metadata.classNames.add(token))
  }

  for (const match of content.matchAll(/<([a-z][a-z0-9-]*)\b/gi)) {
    metadata.tagNames.add(match[1].toLowerCase())
  }

  return metadata
}

function scoreFile(file: IndexedFile, params: NormalizedSearchParams) {
  let score = 0

  if (params.componentName) {
    if (file.metadata.componentNames.has(params.componentName)) {
      score += 140
    } else if (file.metadata.dataComponents.has(params.componentName)) {
      score += 120
    } else if (file.lowerContent.includes(params.componentName)) {
      score += 60
    }
  }

  if (params.tagName && file.metadata.tagNames.has(params.tagName)) {
    score += 80
  }

  if (params.id && file.metadata.ids.has(params.id)) {
    score += 120
  }

  if (params.classTokens.length > 0) {
    let classMatches = 0
    for (const token of params.classTokens) {
      if (file.metadata.classNames.has(token)) {
        classMatches += 1
      }
    }
    if (classMatches > 0) {
      score += Math.min(40 * classMatches, 160)
    }
  }

  if (params.textContent && file.lowerContent.includes(params.textContent)) {
    score += 30
  }

  if (score === 0) {
    return { score: 0, lineNumber: 1, preview: '' }
  }

  const tagRegex = params.tagName ? new RegExp(`<${escapeRegExp(params.tagName)}[\\s>/]`, 'i') : undefined
  const idRegex = params.id ? new RegExp(`id=["']${escapeRegExp(params.id)}["']`, 'i') : undefined
  const componentRegex = params.componentName ? new RegExp(`\\b${escapeRegExp(params.componentName)}\\b`, 'i') : undefined
  const dataComponentRegex = params.componentName
    ? new RegExp(`data-component=["'][^"']*${escapeRegExp(params.componentName)}[^"']*["']`, 'i')
    : undefined
  const classAttributeRegexes = params.classTokens.map(
    (token) => new RegExp(`class(?:Name)?=["'][^"']*${escapeRegExp(token)}[^"']*["']`, 'i')
  )

  const lines = file.lines
  let bestLineIndex = 0
  let bestLineScore = 0

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index]
    let lineScore = 0

    if (tagRegex && tagRegex.test(line)) lineScore += 50
    if (idRegex && idRegex.test(line)) lineScore += 40
    if (componentRegex && componentRegex.test(line)) lineScore += 20
    if (dataComponentRegex && dataComponentRegex.test(line)) lineScore += 20

    if (classAttributeRegexes.length > 0) {
      let lineClassMatches = 0
      for (const regex of classAttributeRegexes) {
        if (regex.test(line)) {
          lineClassMatches += 1
        }
      }
      if (lineClassMatches > 0) {
        lineScore += 30 + (lineClassMatches - 1) * 5
      }
    }

    if (params.textContent && line.toLowerCase().includes(params.textContent)) {
      lineScore += 10
    }

    if (lineScore > bestLineScore) {
      bestLineScore = lineScore
      bestLineIndex = index
    }
  }

  const preview = lines[bestLineIndex]?.trim().slice(0, 160) ?? ''

  return {
    score: score + bestLineScore,
    lineNumber: bestLineIndex + 1,
    preview,
  }
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}


