# Implementation Plan: Lean Workflow Tool with VoltAgent

## Executive Summary

A streamlined Electron app for workflow-based document generation (e.g., Engineer's Reports for Discharge Permits) with file management, VoltAgent orchestration, and local storage.

**Focus**: Get to MVP fast with only essential features for internal use.

---

## Core Stack

### Dependencies
```json
{
  "dependencies": {
    // VoltAgent & AI SDK (OpenAI only)
    "@voltagent/core": "latest",
    "ai": "^3.x",
    "@ai-sdk/openai": "latest",

    // Database
    "@prisma/client": "^5.x",
    "prisma": "^5.x",

    // File handling
    "formidable": "^3.x",  // For file uploads (if needed in main process)
    "mime-types": "^2.x",

    // Utilities
    "zod": "^3.x",
    "nanoid": "^5.x"  // Simple ID generation
  }
}
```

---

## Database Schema (Simplified)

### File: `prisma/schema.prisma`

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "sqlite"
  url      = "file:./app.db"
}

// API Key storage (just OpenAI for now)
model ApiKey {
  id           String   @id @default(uuid())
  provider     String   @default("openai")
  encryptedKey String   // Encrypted with Electron safeStorage
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt
}

// Workflow definitions (e.g., "Discharge Permit")
model Workflow {
  id          String   @id @default(uuid())
  name        String   // "Discharge Permit - Engineer's Report"
  description String?
  status      String   // draft, active, archived
  config      Json     // Workflow configuration (steps, prompts, etc.)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  runs WorkflowRun[]
}

// Individual workflow executions
model WorkflowRun {
  id          String   @id @default(uuid())
  workflowId  String
  status      String   // pending, running, paused, completed, failed
  currentStep Int      @default(0)
  metadata    Json     @default("{}")  // User inputs, step results, etc.
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  completedAt DateTime?

  workflow Workflow @relation(fields: [workflowId], references: [id])
  files    File[]
  traces   AgentTrace[]

  @@index([workflowId, createdAt])
}

// File storage (uploads and generated)
model File {
  id            String   @id @default(uuid())
  workflowRunId String
  filename      String
  originalName  String
  mimeType      String
  size          Int
  fileType      String   // upload, generated
  category      String?  // supporting_doc, engineers_report, etc.
  localPath     String   // Absolute path on disk
  metadata      Json     @default("{}")
  createdAt     DateTime @default(now())

  workflowRun WorkflowRun @relation(fields: [workflowRunId], references: [id])

  @@index([workflowRunId])
}

// VoltAgent execution traces
model AgentTrace {
  id            String   @id @default(uuid())
  workflowRunId String
  step          Int      // Which workflow step
  agentName     String
  input         String   // Prompt/input
  output        String   // Agent response
  toolCalls     Json     @default("[]")  // Tools used
  tokens        Int      @default(0)
  durationMs    Int
  createdAt     DateTime @default(now())

  workflowRun WorkflowRun @relation(fields: [workflowRunId], references: [id])

  @@index([workflowRunId, step])
}
```

---

## Architecture

```
┌─────────────────────────────────────────┐
│       React UI (Renderer Process)       │
│  ├── Workflow management                │
│  ├── File upload interface              │
│  ├── Progress tracking                  │
│  └── Document viewer                    │
└─────────────────────────────────────────┘
                   ↕ Conveyor IPC
┌─────────────────────────────────────────┐
│         Main Process Services            │
│                                          │
│  ┌────────────────────────────────────┐ │
│  │  WorkflowService                   │ │
│  │  - Execute workflows               │ │
│  │  - Manage steps & state            │ │
│  └────────────────────────────────────┘ │
│                                          │
│  ┌────────────────────────────────────┐ │
│  │  AgentService (VoltAgent)          │ │
│  │  - Document generation             │ │
│  │  - Section generation              │ │
│  └────────────────────────────────────┘ │
│                                          │
│  ┌────────────────────────────────────┐ │
│  │  FileService                       │ │
│  │  - Upload handling                 │ │
│  │  - Local storage                   │ │
│  └────────────────────────────────────┘ │
│                                          │
│  ┌────────────────────────────────────┐ │
│  │  DatabaseService (Prisma/SQLite)   │ │
│  └────────────────────────────────────┘ │
└─────────────────────────────────────────┘
```

---

## Service Implementation

### 1. Database Service (Simplified)

**File:** `lib/main/services/database.service.ts`

```typescript
import { PrismaClient } from '@prisma/client'
import { app } from 'electron'
import path from 'path'
import fs from 'fs/promises'

export class DatabaseService {
  public prisma: PrismaClient
  private dbPath: string

  constructor() {
    this.dbPath = path.join(app.getPath('userData'), 'workflows.db')
  }

  async initialize() {
    // Ensure directory exists
    await fs.mkdir(path.dirname(this.dbPath), { recursive: true })

    // Initialize Prisma
    this.prisma = new PrismaClient({
      datasources: {
        db: { url: `file:${this.dbPath}` }
      }
    })

    await this.prisma.$connect()

    // Run migrations (simple version)
    await this.runMigrations()
  }

  private async runMigrations() {
    // Create tables if they don't exist
    // In development, you can use: npx prisma db push
    // For production, bundle migration files
  }

  async dispose() {
    await this.prisma.$disconnect()
  }
}
```

---

### 2. File Service

**File:** `lib/main/services/file.service.ts`

```typescript
import { app } from 'electron'
import path from 'path'
import fs from 'fs/promises'
import { nanoid } from 'nanoid'
import mime from 'mime-types'
import { DatabaseService } from './database.service'

export class FileService {
  private storagePath: string
  private db: DatabaseService

  constructor(db: DatabaseService) {
    this.db = db
    this.storagePath = path.join(app.getPath('userData'), 'files')
  }

  async initialize() {
    // Create storage directory
    await fs.mkdir(this.storagePath, { recursive: true })
  }

  /**
   * Save uploaded file
   */
  async saveUpload(
    workflowRunId: string,
    fileBuffer: Buffer,
    originalName: string,
    category?: string
  ) {
    const fileId = nanoid()
    const ext = path.extname(originalName)
    const filename = `${fileId}${ext}`
    const localPath = path.join(this.storagePath, filename)

    // Write file to disk
    await fs.writeFile(localPath, fileBuffer)

    // Save to database
    const file = await this.db.prisma.file.create({
      data: {
        id: fileId,
        workflowRunId,
        filename,
        originalName,
        mimeType: mime.lookup(originalName) || 'application/octet-stream',
        size: fileBuffer.length,
        fileType: 'upload',
        category: category || 'supporting_doc',
        localPath,
      }
    })

    return file
  }

  /**
   * Save generated file (e.g., engineer's report)
   */
  async saveGenerated(
    workflowRunId: string,
    content: string,
    filename: string,
    category: string = 'generated'
  ) {
    const fileId = nanoid()
    const fullFilename = `${fileId}_${filename}`
    const localPath = path.join(this.storagePath, fullFilename)

    // Write content to disk
    await fs.writeFile(localPath, content, 'utf-8')

    // Save to database
    const file = await this.db.prisma.file.create({
      data: {
        id: fileId,
        workflowRunId,
        filename: fullFilename,
        originalName: filename,
        mimeType: mime.lookup(filename) || 'text/plain',
        size: Buffer.byteLength(content, 'utf-8'),
        fileType: 'generated',
        category,
        localPath,
      }
    })

    return file
  }

  /**
   * Read file content
   */
  async readFile(fileId: string): Promise<Buffer> {
    const file = await this.db.prisma.file.findUnique({
      where: { id: fileId }
    })

    if (!file) {
      throw new Error('File not found')
    }

    return fs.readFile(file.localPath)
  }

  /**
   * Get files for a workflow run
   */
  async getFiles(workflowRunId: string) {
    return this.db.prisma.file.findMany({
      where: { workflowRunId },
      orderBy: { createdAt: 'asc' }
    })
  }
}
```

---

### 3. Agent Service (VoltAgent)

**File:** `lib/main/services/agent.service.ts`

```typescript
import { Agent } from '@voltagent/core'
import { openai } from '@ai-sdk/openai'
import { safeStorage } from 'electron'
import { DatabaseService } from './database.service'

export class AgentService {
  private agent: Agent | null = null
  private db: DatabaseService

  constructor(db: DatabaseService) {
    this.db = db
  }

  async initialize() {
    // Load API key
    const apiKey = await this.loadApiKey()

    if (!apiKey) {
      console.warn('No OpenAI API key found')
      return
    }

    // Set environment variable
    process.env.OPENAI_API_KEY = apiKey

    // Create default agent
    this.agent = new Agent({
      name: 'document-generator',
      instructions: `You are an expert technical writer specializing in engineering reports and regulatory documents.`,
      model: openai('gpt-4o'),
      tools: [],
    })
  }

  private async loadApiKey(): Promise<string | null> {
    const apiKeyRecord = await this.db.prisma.apiKey.findFirst({
      where: { provider: 'openai' }
    })

    if (!apiKeyRecord) return null

    // Decrypt
    const decrypted = safeStorage.decryptString(
      Buffer.from(apiKeyRecord.encryptedKey, 'base64')
    )

    return decrypted
  }

  /**
   * Save API key (encrypted)
   */
  async saveApiKey(apiKey: string) {
    if (!safeStorage.isEncryptionAvailable()) {
      throw new Error('Encryption not available on this system')
    }

    const encrypted = safeStorage.encryptString(apiKey)

    await this.db.prisma.apiKey.upsert({
      where: { provider: 'openai' },
      create: {
        provider: 'openai',
        encryptedKey: encrypted.toString('base64')
      },
      update: {
        encryptedKey: encrypted.toString('base64')
      }
    })
  }

  /**
   * Generate content with tracing
   */
  async generate(
    workflowRunId: string,
    step: number,
    prompt: string,
    context?: Record<string, any>
  ) {
    if (!this.agent) {
      throw new Error('Agent not initialized (missing API key)')
    }

    const startTime = Date.now()

    // Build full prompt with context
    let fullPrompt = prompt
    if (context) {
      fullPrompt = `${prompt}\n\nContext:\n${JSON.stringify(context, null, 2)}`
    }

    // Run agent
    const result = await this.agent.run(fullPrompt)

    // Save trace
    await this.db.prisma.agentTrace.create({
      data: {
        workflowRunId,
        step,
        agentName: 'document-generator',
        input: fullPrompt,
        output: result.content || '',
        toolCalls: result.toolCalls || [],
        tokens: result.usage?.totalTokens || 0,
        durationMs: Date.now() - startTime,
      }
    })

    return result.content
  }
}
```

---

### 4. Workflow Service

**File:** `lib/main/services/workflow.service.ts`

```typescript
import { DatabaseService } from './database.service'
import { AgentService } from './agent.service'
import { FileService } from './file.service'

export class WorkflowService {
  private db: DatabaseService
  private agent: AgentService
  private files: FileService

  constructor(db: DatabaseService, agent: AgentService, files: FileService) {
    this.db = db
    this.agent = agent
    this.files = files
  }

  /**
   * Create a new workflow run
   */
  async createRun(workflowId: string, initialData?: any) {
    const run = await this.db.prisma.workflowRun.create({
      data: {
        workflowId,
        status: 'pending',
        currentStep: 0,
        metadata: initialData || {}
      }
    })

    return run
  }

  /**
   * Execute workflow step by step
   */
  async executeStep(runId: string) {
    const run = await this.db.prisma.workflowRun.findUnique({
      where: { id: runId },
      include: { workflow: true, files: true }
    })

    if (!run) throw new Error('Workflow run not found')

    const workflow = run.workflow
    const config = workflow.config as any
    const steps = config.steps || []

    if (run.currentStep >= steps.length) {
      // Workflow complete
      await this.db.prisma.workflowRun.update({
        where: { id: runId },
        data: {
          status: 'completed',
          completedAt: new Date()
        }
      })
      return { completed: true }
    }

    // Get current step
    const step = steps[run.currentStep]

    // Update status
    await this.db.prisma.workflowRun.update({
      where: { id: runId },
      data: { status: 'running' }
    })

    // Execute step based on type
    let result: any

    switch (step.type) {
      case 'generate':
        // Generate content with AI
        result = await this.agent.generate(
          runId,
          run.currentStep,
          step.prompt,
          {
            metadata: run.metadata,
            uploadedFiles: run.files.filter(f => f.fileType === 'upload')
          }
        )

        // Save generated content
        if (step.saveAs) {
          await this.files.saveGenerated(
            runId,
            result,
            step.saveAs,
            step.category || 'generated'
          )
        }
        break

      case 'human_review':
        // Pause for human input
        await this.db.prisma.workflowRun.update({
          where: { id: runId },
          data: { status: 'paused' }
        })
        return { paused: true, step }

      default:
        throw new Error(`Unknown step type: ${step.type}`)
    }

    // Move to next step
    await this.db.prisma.workflowRun.update({
      where: { id: runId },
      data: {
        currentStep: run.currentStep + 1,
        metadata: { ...run.metadata, [`step_${run.currentStep}_result`]: result }
      }
    })

    return { completed: false, result }
  }

  /**
   * Resume paused workflow
   */
  async resume(runId: string, humanInput: any) {
    const run = await this.db.prisma.workflowRun.findUnique({
      where: { id: runId }
    })

    if (!run || run.status !== 'paused') {
      throw new Error('Cannot resume workflow')
    }

    // Save human input
    await this.db.prisma.workflowRun.update({
      where: { id: runId },
      data: {
        metadata: { ...run.metadata, human_input: humanInput },
        currentStep: run.currentStep + 1,
        status: 'pending'
      }
    })

    // Continue execution
    return this.executeStep(runId)
  }

  /**
   * Get workflow runs
   */
  async getRuns(workflowId?: string) {
    return this.db.prisma.workflowRun.findMany({
      where: workflowId ? { workflowId } : undefined,
      include: { workflow: true },
      orderBy: { createdAt: 'desc' }
    })
  }

  /**
   * Get run details with files and traces
   */
  async getRunDetails(runId: string) {
    return this.db.prisma.workflowRun.findUnique({
      where: { id: runId },
      include: {
        workflow: true,
        files: { orderBy: { createdAt: 'asc' } },
        traces: { orderBy: { createdAt: 'asc' } }
      }
    })
  }
}
```

---

## Conveyor Integration

### IPC Schemas

**File:** `lib/conveyor/schemas/workflow-schema.ts`

```typescript
import { z } from 'zod'

export const workflowIpcSchema = {
  // Workflow management
  'workflow:list': {
    args: z.tuple([]),
    return: z.array(z.any()),
  },
  'workflow:create-run': {
    args: z.tuple([z.string(), z.any().optional()]),
    return: z.any(),
  },
  'workflow:execute-step': {
    args: z.tuple([z.string()]),
    return: z.any(),
  },
  'workflow:resume': {
    args: z.tuple([z.string(), z.any()]),
    return: z.any(),
  },
  'workflow:get-details': {
    args: z.tuple([z.string()]),
    return: z.any(),
  },

  // File management
  'file:upload': {
    args: z.tuple([z.string(), z.string(), z.instanceof(Uint8Array), z.string().optional()]),
    return: z.any(),
  },
  'file:list': {
    args: z.tuple([z.string()]),
    return: z.array(z.any()),
  },
  'file:read': {
    args: z.tuple([z.string()]),
    return: z.instanceof(Uint8Array),
  },

  // API Key management
  'api-key:save': {
    args: z.tuple([z.string()]),
    return: z.boolean(),
  },
  'api-key:check': {
    args: z.tuple([]),
    return: z.boolean(),
  },
} as const
```

### API Class

**File:** `lib/conveyor/api/workflow-api.ts`

```typescript
import { ConveyorApi } from '../shared'

export class WorkflowApi extends ConveyorApi {
  // Workflows
  listRuns = () => this.invoke('workflow:list')
  createRun = (workflowId: string, data?: any) =>
    this.invoke('workflow:create-run', workflowId, data)
  executeStep = (runId: string) =>
    this.invoke('workflow:execute-step', runId)
  resume = (runId: string, input: any) =>
    this.invoke('workflow:resume', runId, input)
  getDetails = (runId: string) =>
    this.invoke('workflow:get-details', runId)

  // Files
  uploadFile = (runId: string, filename: string, data: Uint8Array, category?: string) =>
    this.invoke('file:upload', runId, filename, data, category)
  listFiles = (runId: string) =>
    this.invoke('file:list', runId)
  readFile = (fileId: string) =>
    this.invoke('file:read', fileId)

  // API Keys
  saveApiKey = (key: string) =>
    this.invoke('api-key:save', key)
  checkApiKey = () =>
    this.invoke('api-key:check')
}
```

### Handlers

**File:** `lib/conveyor/handlers/workflow-handler.ts`

```typescript
import { handle } from '@/lib/main/shared'
import { serviceManager } from '@/lib/main/services/service-manager'
import { WorkflowService } from '@/lib/main/services/workflow.service'
import { FileService } from '@/lib/main/services/file.service'
import { AgentService } from '@/lib/main/services/agent.service'

export function registerWorkflowHandlers() {
  const workflow = serviceManager.get<WorkflowService>('workflow')
  const files = serviceManager.get<FileService>('files')
  const agent = serviceManager.get<AgentService>('agent')

  // Workflow handlers
  handle('workflow:list', async () => {
    return workflow.getRuns()
  })

  handle('workflow:create-run', async (workflowId: string, data?: any) => {
    return workflow.createRun(workflowId, data)
  })

  handle('workflow:execute-step', async (runId: string) => {
    return workflow.executeStep(runId)
  })

  handle('workflow:resume', async (runId: string, input: any) => {
    return workflow.resume(runId, input)
  })

  handle('workflow:get-details', async (runId: string) => {
    return workflow.getRunDetails(runId)
  })

  // File handlers
  handle('file:upload', async (
    runId: string,
    filename: string,
    data: Uint8Array,
    category?: string
  ) => {
    const buffer = Buffer.from(data)
    return files.saveUpload(runId, buffer, filename, category)
  })

  handle('file:list', async (runId: string) => {
    return files.getFiles(runId)
  })

  handle('file:read', async (fileId: string) => {
    const buffer = await files.readFile(fileId)
    return new Uint8Array(buffer)
  })

  // API Key handlers
  handle('api-key:save', async (key: string) => {
    await agent.saveApiKey(key)
    return true
  })

  handle('api-key:check', async () => {
    // Check if API key exists
    const key = await (agent as any).loadApiKey()
    return !!key
  })
}
```

---

## Example Workflow Configuration

**Discharge Permit Engineer's Report Workflow**

```typescript
// This would be stored in the Workflow table's config field
const dischargePermitWorkflow = {
  name: "Discharge Permit - Engineer's Report",
  steps: [
    {
      type: 'generate',
      prompt: `Generate the Executive Summary section for an Engineer's Report for a wastewater discharge permit application.

Use the following information from uploaded documents:
- Project name and location
- Discharge characteristics
- Treatment systems

Write in a professional technical style suitable for regulatory review.`,
      saveAs: 'executive-summary.txt',
      category: 'engineers_report_section'
    },
    {
      type: 'generate',
      prompt: `Generate the Project Description section...`,
      saveAs: 'project-description.txt',
      category: 'engineers_report_section'
    },
    {
      type: 'human_review',
      message: 'Please review the generated sections and provide any corrections or additions.'
    },
    {
      type: 'generate',
      prompt: `Generate the Technical Analysis section...`,
      saveAs: 'technical-analysis.txt',
      category: 'engineers_report_section'
    },
    {
      type: 'generate',
      prompt: `Compile all sections into a complete Engineer's Report with proper formatting and table of contents.

Sections to include:
- Executive Summary
- Project Description
- Technical Analysis
{include any human feedback}

Output as a complete markdown document.`,
      saveAs: 'engineers-report-complete.md',
      category: 'engineers_report'
    }
  ]
}
```

---

## UI Components (React)

### Workflow Run Page

```tsx
// app/pages/WorkflowRun.tsx
import { useState, useEffect } from 'react'
import { useConveyor } from '@/app/hooks/useConveyor'
import { Button } from '@/app/components/ui/button'
import { Card } from '@/app/components/ui/card'

export function WorkflowRunPage({ runId }: { runId: string }) {
  const workflow = useConveyor('workflow')
  const [run, setRun] = useState<any>(null)
  const [executing, setExecuting] = useState(false)

  useEffect(() => {
    loadDetails()
  }, [runId])

  const loadDetails = async () => {
    const details = await workflow.getDetails(runId)
    setRun(details)
  }

  const executeNext = async () => {
    setExecuting(true)
    try {
      const result = await workflow.executeStep(runId)
      if (result.completed) {
        alert('Workflow completed!')
      }
      await loadDetails()
    } catch (error) {
      console.error(error)
    } finally {
      setExecuting(false)
    }
  }

  const handleFileUpload = async (file: File) => {
    const arrayBuffer = await file.arrayBuffer()
    const data = new Uint8Array(arrayBuffer)

    await workflow.uploadFile(runId, file.name, data, 'supporting_doc')
    await loadDetails()
  }

  if (!run) return <div>Loading...</div>

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">{run.workflow.name}</h1>

      {/* Status */}
      <Card className="mb-4 p-4">
        <div>Status: {run.status}</div>
        <div>Step: {run.currentStep + 1} / {run.workflow.config.steps.length}</div>
      </Card>

      {/* File Upload */}
      {run.status === 'pending' && run.currentStep === 0 && (
        <Card className="mb-4 p-4">
          <h3 className="font-semibold mb-2">Upload Supporting Documents</h3>
          <input
            type="file"
            multiple
            onChange={(e) => {
              Array.from(e.target.files || []).forEach(handleFileUpload)
            }}
          />
        </Card>
      )}

      {/* Uploaded Files */}
      {run.files.length > 0 && (
        <Card className="mb-4 p-4">
          <h3 className="font-semibold mb-2">Files</h3>
          <ul>
            {run.files.map((f: any) => (
              <li key={f.id}>
                {f.originalName} ({f.fileType})
              </li>
            ))}
          </ul>
        </Card>
      )}

      {/* Execute Button */}
      {run.status === 'pending' && (
        <Button onClick={executeNext} disabled={executing}>
          {executing ? 'Executing...' : 'Execute Next Step'}
        </Button>
      )}

      {/* Agent Traces */}
      {run.traces.length > 0 && (
        <Card className="mt-4 p-4">
          <h3 className="font-semibold mb-2">Agent Execution Log</h3>
          {run.traces.map((trace: any) => (
            <div key={trace.id} className="mb-2 border-b pb-2">
              <div className="text-sm text-gray-500">Step {trace.step}</div>
              <div className="text-xs">{trace.tokens} tokens, {trace.durationMs}ms</div>
              <details>
                <summary className="cursor-pointer text-sm">View Details</summary>
                <pre className="text-xs mt-2 bg-gray-100 p-2 rounded">
                  {trace.output}
                </pre>
              </details>
            </div>
          ))}
        </Card>
      )}
    </div>
  )
}
```

---

## Initialization

**File:** `lib/main/app.ts` (simplified initialization)

```typescript
import { DatabaseService } from './services/database.service'
import { FileService } from './services/file.service'
import { AgentService } from './services/agent.service'
import { WorkflowService } from './services/workflow.service'
import { registerWorkflowHandlers } from '@/lib/conveyor/handlers/workflow-handler'

// Simple service manager
class ServiceManager {
  private services = new Map<string, any>()

  register(name: string, service: any) {
    this.services.set(name, service)
  }

  get<T>(name: string): T {
    return this.services.get(name)
  }
}

export const serviceManager = new ServiceManager()

export async function initializeServices() {
  // Initialize in order
  const db = new DatabaseService()
  await db.initialize()
  serviceManager.register('database', db)

  const files = new FileService(db)
  await files.initialize()
  serviceManager.register('files', files)

  const agent = new AgentService(db)
  await agent.initialize()
  serviceManager.register('agent', agent)

  const workflow = new WorkflowService(db, agent, files)
  serviceManager.register('workflow', workflow)

  // Register IPC handlers
  registerWorkflowHandlers()

  console.log('Services initialized')
}
```

---

## Development Workflow

### 1. Set up Prisma

```bash
# Install dependencies
npm install @prisma/client prisma

# Initialize Prisma (if not done)
npx prisma init

# Create schema (copy from above)

# Generate Prisma client
npx prisma generate

# Push schema to database (development)
npx prisma db push
```

### 2. Seed Initial Workflow

```typescript
// scripts/seed-workflows.ts
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  await prisma.workflow.create({
    data: {
      name: 'Discharge Permit - Engineer\'s Report',
      description: 'Generate a complete engineer\'s report for wastewater discharge permit',
      status: 'active',
      config: {
        steps: [
          // ... (workflow config from above)
        ]
      }
    }
  })
}

main()
```

### 3. Run Development

```bash
npm run dev
```

---

## What's Removed from v4 (Lean Approach)

❌ Multiple AI providers (just OpenAI)
❌ User management (single user assumed)
❌ Custom agent definitions UI
❌ Usage tracking with costs
❌ Sentry integration
❌ Complex monitoring/observability
❌ Request context with cls-hooked
❌ Error logs table
❌ Tool definitions table
❌ E2E testing setup

## What's Kept/Added

✅ Prisma with SQLite
✅ VoltAgent + AI SDK (OpenAI)
✅ Conveyor IPC architecture
✅ API key encryption
✅ File upload/storage system
✅ Workflow orchestration
✅ Agent trace logging
✅ Human-in-the-loop support

---

## Next Steps

1. **Set up Prisma schema** and generate client
2. **Implement services** (Database → File → Agent → Workflow)
3. **Create Conveyor handlers** for IPC
4. **Build basic UI** for workflow execution
5. **Create first workflow** (Discharge Permit)
6. **Test end-to-end** with sample documents

This lean version gets you to a working MVP much faster while keeping the architecture clean and extensible for future features.
