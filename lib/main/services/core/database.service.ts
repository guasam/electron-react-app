import { app } from 'electron'
import path from 'path'
import fs from 'fs/promises'
import log from 'electron-log/main'
import Database from 'better-sqlite3'
import { drizzle, BetterSQLite3Database } from 'drizzle-orm/better-sqlite3'
import { migrate } from 'drizzle-orm/better-sqlite3/migrator'
import { sql } from 'drizzle-orm'
import * as schema from '@/lib/main/db/schema'

export class DatabaseService {
  public db!: BetterSQLite3Database<typeof schema>
  private sqlite!: Database.Database
  private dbPath: string

  constructor() {
    this.dbPath = path.join(app.getPath('userData'), 'workflows.db')
  }

  async initialize() {
    // Ensure database directory exists
    await fs.mkdir(path.dirname(this.dbPath), { recursive: true })

    // Initialize better-sqlite3
    this.sqlite = new Database(this.dbPath)
    this.sqlite.pragma('journal_mode = WAL')
    this.sqlite.pragma('foreign_keys = ON')

    // Initialize Drizzle
    this.db = drizzle(this.sqlite, { schema })

    // Push schema to database (creates/updates tables)
    await this.pushSchema()

    // Seed initial data
    await this.seedDatabase()

    log.info('Database service initialized at:', this.dbPath)
  }

  /**
   * Push schema to database
   * This creates tables if they don't exist and updates them if needed
   */
  private async pushSchema(): Promise<void> {
    try {
      // Check if tables exist
      const tables = this.sqlite
        .prepare(
          `SELECT name FROM sqlite_master WHERE type='table' AND name='WorkflowDefinition' LIMIT 1`
        )
        .all()

      if (tables.length === 0) {
        log.info('Database schema not found, creating tables...')

        // Create all tables using the schema
        // In production, you would use migrations, but for initial setup we can use drizzle-kit push
        // For now, we'll manually execute the schema creation
        await this.createTables()

        log.info('Database schema created successfully')
      } else {
        log.info('Database schema exists, skipping creation')
      }
    } catch (error) {
      log.error('Failed to push schema:', error)
      throw error
    }
  }

  /**
   * Create database tables manually
   * This is a fallback for initial setup without migrations
   */
  private async createTables(): Promise<void> {
    const statements = [
      // ApiKey table
      `CREATE TABLE IF NOT EXISTS "ApiKey" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "provider" TEXT NOT NULL DEFAULT 'openai',
        "encryptedKey" TEXT NOT NULL,
        "isActive" INTEGER NOT NULL DEFAULT 1,
        "createdAt" INTEGER NOT NULL,
        "updatedAt" INTEGER NOT NULL,
        CONSTRAINT "ApiKey_provider_key" UNIQUE("provider")
      )`,

      // WorkflowDefinition table
      `CREATE TABLE IF NOT EXISTS "WorkflowDefinition" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "name" TEXT NOT NULL,
        "description" TEXT,
        "version" TEXT NOT NULL DEFAULT '1.0.0',
        "config" TEXT NOT NULL,
        "schema" TEXT NOT NULL,
        "isActive" INTEGER NOT NULL DEFAULT 1,
        "createdAt" INTEGER NOT NULL,
        "updatedAt" INTEGER NOT NULL
      )`,

      // WorkflowRun table
      `CREATE TABLE IF NOT EXISTS "WorkflowRun" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "workflowId" TEXT NOT NULL,
        "workflowVersion" TEXT NOT NULL,
        "status" TEXT NOT NULL,
        "currentStep" INTEGER NOT NULL DEFAULT 0,
        "totalSteps" INTEGER NOT NULL,
        "input" TEXT NOT NULL,
        "output" TEXT,
        "error" TEXT,
        "executionTimeMs" INTEGER,
        "pausedAt" INTEGER,
        "pausedReason" TEXT,
        "resumeData" TEXT,
        "createdAt" INTEGER NOT NULL,
        "startedAt" INTEGER,
        "completedAt" INTEGER,
        "createdBy" TEXT NOT NULL DEFAULT 'system',
        FOREIGN KEY ("workflowId") REFERENCES "WorkflowDefinition"("id") ON DELETE RESTRICT ON UPDATE CASCADE
      )`,

      `CREATE INDEX IF NOT EXISTS "WorkflowRun_workflowId_createdAt_idx" ON "WorkflowRun"("workflowId", "createdAt")`,
      `CREATE INDEX IF NOT EXISTS "WorkflowRun_status_idx" ON "WorkflowRun"("status")`,

      // WorkflowStep table
      `CREATE TABLE IF NOT EXISTS "WorkflowStep" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "workflowRunId" TEXT NOT NULL,
        "stepIndex" INTEGER NOT NULL,
        "stepName" TEXT NOT NULL,
        "stepType" TEXT NOT NULL,
        "status" TEXT NOT NULL,
        "input" TEXT,
        "output" TEXT,
        "error" TEXT,
        "executionTimeMs" INTEGER,
        "retryCount" INTEGER NOT NULL DEFAULT 0,
        "maxRetries" INTEGER NOT NULL DEFAULT 3,
        "createdAt" INTEGER NOT NULL,
        "startedAt" INTEGER,
        "completedAt" INTEGER,
        FOREIGN KEY ("workflowRunId") REFERENCES "WorkflowRun"("id") ON DELETE CASCADE ON UPDATE CASCADE,
        CONSTRAINT "WorkflowStep_workflowRunId_stepIndex_key" UNIQUE("workflowRunId", "stepIndex")
      )`,

      `CREATE INDEX IF NOT EXISTS "WorkflowStep_workflowRunId_status_idx" ON "WorkflowStep"("workflowRunId", "status")`,

      // File table
      `CREATE TABLE IF NOT EXISTS "File" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "workflowRunId" TEXT NOT NULL,
        "filename" TEXT NOT NULL,
        "originalName" TEXT NOT NULL,
        "mimeType" TEXT NOT NULL,
        "size" INTEGER NOT NULL,
        "fileType" TEXT NOT NULL,
        "category" TEXT NOT NULL,
        "version" INTEGER NOT NULL DEFAULT 1,
        "parentFileId" TEXT,
        "localPath" TEXT NOT NULL,
        "hash" TEXT,
        "metadata" TEXT NOT NULL DEFAULT '{}',
        "extractedText" TEXT,
        "createdAt" INTEGER NOT NULL,
        "createdBy" TEXT NOT NULL DEFAULT 'system',
        FOREIGN KEY ("workflowRunId") REFERENCES "WorkflowRun"("id") ON DELETE CASCADE ON UPDATE CASCADE,
        FOREIGN KEY ("parentFileId") REFERENCES "File"("id") ON DELETE SET NULL ON UPDATE CASCADE
      )`,

      `CREATE INDEX IF NOT EXISTS "File_workflowRunId_fileType_idx" ON "File"("workflowRunId", "fileType")`,
      `CREATE INDEX IF NOT EXISTS "File_hash_idx" ON "File"("hash")`,

      // HumanReview table
      `CREATE TABLE IF NOT EXISTS "HumanReview" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "workflowRunId" TEXT NOT NULL,
        "reviewType" TEXT NOT NULL,
        "title" TEXT NOT NULL,
        "description" TEXT,
        "status" TEXT NOT NULL,
        "contextData" TEXT NOT NULL DEFAULT '{}',
        "reviewerNotes" TEXT,
        "decision" TEXT,
        "submittedAt" INTEGER,
        "createdAt" INTEGER NOT NULL,
        FOREIGN KEY ("workflowRunId") REFERENCES "WorkflowRun"("id") ON DELETE CASCADE ON UPDATE CASCADE
      )`,

      `CREATE INDEX IF NOT EXISTS "HumanReview_workflowRunId_status_idx" ON "HumanReview"("workflowRunId", "status")`,

      // SystemConfig table
      `CREATE TABLE IF NOT EXISTS "SystemConfig" (
        "key" TEXT NOT NULL PRIMARY KEY,
        "value" TEXT NOT NULL,
        "updatedAt" INTEGER NOT NULL
      )`,
    ]

    for (const statement of statements) {
      this.sqlite.exec(statement)
    }
  }

  private async seedDatabase() {
    // Check if we need to seed
    const workflowCount = await this.db
      .select({ count: sql<number>`count(*)` })
      .from(schema.workflowDefinitions)
      .then((result) => result[0].count)

    if (workflowCount === 0) {
      // Create default discharge permit workflow
      await this.db.insert(schema.workflowDefinitions).values({
        id: 'discharge-permit',
        name: "Discharge Permit - Engineer's Report",
        description: "Generate comprehensive engineer's report for wastewater discharge permits",
        version: '1.0.0',
        config: JSON.stringify({}),
        schema: JSON.stringify({}),
      })

      log.info('Database seeded with default workflow')
    }
  }

  async dispose() {
    if (this.sqlite) {
      this.sqlite.close()
    }
  }

  // Utility methods
  async vacuum() {
    // Optimize SQLite database
    this.sqlite.exec('VACUUM')
  }

  async backup(backupPath?: string) {
    const destination =
      backupPath || path.join(app.getPath('userData'), `backup-${Date.now()}.db`)

    await fs.copyFile(this.dbPath, destination)
    return destination
  }

  async getStats() {
    const stats = this.sqlite
      .prepare(
        `
      SELECT
        name as table_name,
        (SELECT COUNT(*) FROM sqlite_master WHERE type='table' AND name=m.name) as row_count
      FROM sqlite_master m
      WHERE type='table' AND name NOT LIKE 'sqlite_%'
      GROUP BY name
    `
      )
      .all() as Array<{ table_name: string; row_count: number }>

    return stats
  }
}
