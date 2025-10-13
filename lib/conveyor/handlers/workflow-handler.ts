import { handle } from '@/lib/main/shared'
import { serviceManager } from '@/lib/main/services/service-manager'
import { eq, desc } from 'drizzle-orm'
import { workflowRuns, files } from '@/lib/main/db/schema'
import type { VoltAgentService } from '@/lib/main/services/voltagent'
import type { FileService } from '@/lib/main/services/core/file.service'
import type { ApiKeyService } from '@/lib/main/services/core/api-key.service'
import type { DatabaseService } from '@/lib/main/services/core/database.service'
import type { WorkflowExecutor } from '@/lib/main/services/workflow/workflow-executor'
import log from 'electron-log/main'

export function registerWorkflowHandlers() {
  const voltAgent = serviceManager.get<VoltAgentService>('voltAgent')
  const fileService = serviceManager.get<FileService>('files')
  const apiKeys = serviceManager.get<ApiKeyService>('apiKeys')
  const dbService = serviceManager.get<DatabaseService>('database')
  const executor = serviceManager.get<WorkflowExecutor>('workflowExecutor')

  // Workflow handlers
  handle('workflow:list-available', async () => {
    return voltAgent.getWorkflows()
  })

  handle('workflow:create-run', async (workflowId: string, input: any) => {
    const [run] = await dbService.db
      .insert(workflowRuns)
      .values({
        workflowId,
        workflowVersion: '1.0.0',
        status: 'pending',
        totalSteps: 7, // Number of steps in discharge permit workflow
        input: JSON.stringify(input || {}),
      })
      .returning()

    log.info('Workflow run created:', run.id)
    return { runId: run.id }
  })

  handle('workflow:execute', async (runId: string) => {
    log.info('Executing workflow:', runId)
    return await executor.execute(runId)
  })

  handle('workflow:list-runs', async () => {
    const runs = await dbService.db
      .select()
      .from(workflowRuns)
      .orderBy(desc(workflowRuns.createdAt))
      .limit(50)

    return runs.map((run) => ({
      ...run,
      createdAt: run.createdAt.toISOString(),
      startedAt: run.startedAt?.toISOString() || null,
      completedAt: run.completedAt?.toISOString() || null,
    }))
  })

  handle('workflow:get-run', async (runId: string) => {
    const run = await dbService.db
      .select()
      .from(workflowRuns)
      .where(eq(workflowRuns.id, runId))
      .limit(1)
      .then((rows) => rows[0])

    if (!run) throw new Error('Workflow run not found')

    // Get associated files
    const runFiles = await dbService.db.select().from(files).where(eq(files.workflowRunId, runId))

    return {
      ...run,
      createdAt: run.createdAt.toISOString(),
      startedAt: run.startedAt?.toISOString() || null,
      completedAt: run.completedAt?.toISOString() || null,
      files: runFiles.map((f) => ({
        ...f,
        createdAt: f.createdAt.toISOString(),
      })),
    }
  })

  // File handlers
  handle('file:upload', async (runId: string, filename: string, data: Uint8Array, category?: string) => {
    const buffer = Buffer.from(data)
    const file = await fileService.saveUpload(runId, buffer, filename, category)
    return { fileId: file.id }
  })

  handle('file:list', async (runId: string) => {
    const fileList = await fileService.getFiles(runId)
    return fileList.map((f) => ({
      ...f,
      createdAt: f.createdAt.toISOString(),
    }))
  })

  handle('file:read', async (fileId: string) => {
    const buffer = await fileService.readFile(fileId)
    return new Uint8Array(buffer)
  })

  // API Key handlers
  handle('api-key:save', async (key: string) => {
    await apiKeys.save(key)
    // Set in environment
    process.env.OPENAI_API_KEY = key
    log.info('API key saved and loaded')
    return true
  })

  handle('api-key:exists', async () => {
    return await apiKeys.exists()
  })

  handle('api-key:delete', async () => {
    await apiKeys.delete()
    log.info('API key deleted')
    return true
  })

  log.info('Workflow handlers registered')
}
