import { app } from 'electron'
import path from 'path'
import fs from 'fs/promises'
import crypto from 'crypto'
import { nanoid } from 'nanoid'
import mime from 'mime-types'
import { eq, and, lt, inArray, asc } from 'drizzle-orm'
import { DatabaseService } from './database.service'
import { EventBusService } from './event-bus.service'
import { files, workflowRuns } from '@/lib/main/db/schema'
import log from 'electron-log/main'

export class FileService {
  private storagePath: string

  constructor(
    private dbService: DatabaseService,
    private eventBus: EventBusService
  ) {
    this.storagePath = path.join(app.getPath('userData'), 'files')
  }

  async initialize() {
    await fs.mkdir(this.storagePath, { recursive: true })
    log.info('File service initialized at:', this.storagePath)
  }

  /**
   * Calculate file hash for deduplication
   */
  private async calculateHash(buffer: Buffer): Promise<string> {
    return crypto.createHash('sha256').update(buffer).digest('hex')
  }

  /**
   * Save uploaded file with deduplication
   */
  async saveUpload(
    workflowRunId: string,
    fileBuffer: Buffer,
    originalName: string,
    category: string = 'supporting_doc'
  ) {
    const hash = await this.calculateHash(fileBuffer)

    // Check for existing file with same hash in this workflow run
    const existing = await this.dbService.db
      .select()
      .from(files)
      .where(and(eq(files.hash, hash), eq(files.workflowRunId, workflowRunId)))
      .limit(1)
      .then((rows) => rows[0])

    if (existing) {
      log.info('File already exists (deduplication):', originalName)
      return existing
    }

    const fileId = nanoid()
    const ext = path.extname(originalName)
    const filename = `${fileId}${ext}`
    const localPath = path.join(this.storagePath, filename)

    // Write file
    await fs.writeFile(localPath, fileBuffer)

    // Save to database
    const [file] = await this.dbService.db
      .insert(files)
      .values({
        id: fileId,
        workflowRunId,
        filename,
        originalName,
        mimeType: (mime.lookup(originalName) as string) || 'application/octet-stream',
        size: fileBuffer.length,
        fileType: 'upload',
        category,
        localPath,
        hash,
      })
      .returning()

    this.eventBus.emit('file:uploaded', { fileId, workflowRunId })
    log.info('File uploaded:', originalName, `(${file.size} bytes)`)

    return file
  }

  /**
   * Save generated file with versioning
   */
  async saveGenerated(
    workflowRunId: string,
    content: string,
    filename: string,
    category: string = 'generated',
    parentFileId?: string
  ) {
    const fileId = nanoid()
    const fullFilename = `${fileId}_${filename}`
    const localPath = path.join(this.storagePath, fullFilename)

    // Write content
    await fs.writeFile(localPath, content, 'utf-8')

    // Determine version
    let version = 1
    if (parentFileId) {
      const parent = await this.dbService.db
        .select()
        .from(files)
        .where(eq(files.id, parentFileId))
        .limit(1)
        .then((rows) => rows[0])

      version = (parent?.version || 0) + 1
    }

    // Save to database
    const [file] = await this.dbService.db
      .insert(files)
      .values({
        id: fileId,
        workflowRunId,
        filename: fullFilename,
        originalName: filename,
        mimeType: (mime.lookup(filename) as string) || 'text/plain',
        size: Buffer.byteLength(content, 'utf-8'),
        fileType: 'generated',
        category,
        version,
        parentFileId,
        localPath,
      })
      .returning()

    this.eventBus.emit('file:generated', { fileId, workflowRunId, version })
    log.info('File generated:', filename, `(version ${version})`)

    return file
  }

  /**
   * Read file content
   */
  async readFile(fileId: string): Promise<Buffer> {
    const file = await this.dbService.db
      .select()
      .from(files)
      .where(eq(files.id, fileId))
      .limit(1)
      .then((rows) => rows[0])

    if (!file) throw new Error(`File not found: ${fileId}`)

    try {
      return await fs.readFile(file.localPath)
    } catch (error) {
      log.error('Failed to read file:', file.localPath, error)
      throw new Error(`Failed to read file: ${file.originalName}`)
    }
  }

  /**
   * Read file as string
   */
  async readFileAsString(fileId: string): Promise<string> {
    const buffer = await this.readFile(fileId)
    return buffer.toString('utf-8')
  }

  /**
   * Get files for a workflow run
   */
  async getFiles(workflowRunId: string) {
    return this.dbService.db
      .select()
      .from(files)
      .where(eq(files.workflowRunId, workflowRunId))
      .orderBy(asc(files.createdAt))
  }

  /**
   * Get files by category
   */
  async getFilesByCategory(workflowRunId: string, category: string) {
    return this.dbService.db
      .select()
      .from(files)
      .where(and(eq(files.workflowRunId, workflowRunId), eq(files.category, category)))
      .orderBy(asc(files.createdAt))
  }

  /**
   * Get file versions
   */
  async getVersions(fileId: string) {
    const file = await this.dbService.db
      .select()
      .from(files)
      .where(eq(files.id, fileId))
      .limit(1)
      .then((rows) => rows[0])

    if (!file) return []

    // Get all versions that have this file as parent
    const versions = await this.dbService.db
      .select()
      .from(files)
      .where(eq(files.parentFileId, fileId))
      .orderBy(asc(files.version))

    return versions
  }

  /**
   * Clean up old files (retention policy)
   */
  async cleanup(retentionDays: number = 30) {
    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - retentionDays)

    // Get old files from completed/failed/cancelled workflows
    const oldFiles = await this.dbService.db
      .select({
        id: files.id,
        localPath: files.localPath,
      })
      .from(files)
      .innerJoin(workflowRuns, eq(files.workflowRunId, workflowRuns.id))
      .where(
        and(
          lt(files.createdAt, cutoffDate),
          inArray(workflowRuns.status, ['completed', 'failed', 'cancelled'])
        )
      )

    let deletedCount = 0

    for (const file of oldFiles) {
      try {
        await fs.unlink(file.localPath)
        await this.dbService.db.delete(files).where(eq(files.id, file.id))
        deletedCount++
      } catch (error) {
        log.error(`Failed to delete file ${file.id}:`, error)
      }
    }

    log.info(`Cleaned up ${deletedCount} old files`)
    return deletedCount
  }
}
