# Implementation Plan v2: Lean Workflow Tool with VoltAgent (Proper Architecture)

## Executive Summary

Updated implementation using VoltAgent's built-in workflow system, proper tool definitions, and agent memory. No server initialization needed - VoltAgent runs directly in Electron's main process.

---

## Core Stack

### Dependencies
```json
{
  "dependencies": {
    // VoltAgent & AI SDK
    "@voltagent/core": "latest",
    "ai": "^3.x",
    "@ai-sdk/openai": "latest",

    // Database & Memory
    "@prisma/client": "^5.x",
    "prisma": "^5.x",
    "@libsql/client": "^0.x",  // For VoltAgent memory storage

    // File handling
    "mime-types": "^2.x",

    // Utilities
    "zod": "^3.x",
    "nanoid": "^5.x"
  }
}
```

---

## Updated Architecture

```
┌─────────────────────────────────────────┐
│       React UI (Renderer Process)       │
│  ├── Workflow management                │
│  ├── File upload interface              │
│  └── Progress tracking                  │
└─────────────────────────────────────────┘
                   ↕ Conveyor IPC
┌─────────────────────────────────────────┐
│         Main Process Services            │
│                                          │
│  ┌────────────────────────────────────┐ │
│  │  VoltAgent Layer                   │ │
│  │  ├── Workflows (createWorkflowChain)│ │
│  │  ├── Agents (with Memory)          │ │
│  │  └── Tools (createTool)            │ │
│  └────────────────────────────────────┘ │
│                                          │
│  ┌────────────────────────────────────┐ │
│  │  FileService                       │ │
│  │  - Upload/storage management       │ │
│  └────────────────────────────────────┘ │
│                                          │
│  ┌────────────────────────────────────┐ │
│  │  DatabaseService (Prisma/SQLite)   │ │
│  │  - Workflow runs & metadata        │ │
│  │  - File references                 │ │
│  └────────────────────────────────────┘ │
└─────────────────────────────────────────┘
```

---

## Database Schema (Simplified for VoltAgent)

### File: `prisma/schema.prisma`

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "sqlite"
  url      = "file:./app.db"
}

// API Key storage
model ApiKey {
  id           String   @id @default(uuid())
  provider     String   @default("openai")
  encryptedKey String
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt
}

// Workflow run tracking (VoltAgent workflows)
model WorkflowRun {
  id            String   @id @default(uuid())
  workflowId    String   // VoltAgent workflow ID
  workflowName  String
  status        String   // pending, running, completed, failed
  input         Json     // Workflow input data
  output        Json?    // Workflow result
  executionTime Int?     // Milliseconds
  error         String?
  createdAt     DateTime @default(now())
  completedAt   DateTime?

  files File[]

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
  localPath     String
  metadata      Json     @default("{}")
  createdAt     DateTime @default(now())

  workflowRun WorkflowRun @relation(fields: [workflowRunId], references: [id], onDelete: Cascade)

  @@index([workflowRunId])
}
```

**Note:** VoltAgent handles its own execution traces and agent memory via LibSQL, so we don't need separate trace tables.

---

## Service Implementation

### Directory Structure

```
lib/main/services/
├── database.service.ts         # Prisma database service
├── file.service.ts             # File upload/storage
├── api-key.service.ts          # API key management
└── voltagent/
    ├── index.ts                # Main VoltAgent setup
    ├── tools/
    │   ├── file-reader.tool.ts      # Read uploaded files
    │   ├── document-parser.tool.ts  # Parse documents
    │   └── file-saver.tool.ts       # Save generated content
    ├── agents/
    │   ├── document-generator.agent.ts
    │   ├── section-writer.agent.ts
    │   └── reviewer.agent.ts
    └── workflows/
        ├── discharge-permit.workflow.ts
        └── index.ts
```

---

## 1. API Key Service

**File:** `lib/main/services/api-key.service.ts`

```typescript
import { safeStorage } from 'electron'
import { DatabaseService } from './database.service'

export class ApiKeyService {
  constructor(private db: DatabaseService) {}

  async save(apiKey: string) {
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

  async get(): Promise<string | null> {
    const apiKeyRecord = await this.db.prisma.apiKey.findFirst({
      where: { provider: 'openai' }
    })

    if (!apiKeyRecord) return null

    const decrypted = safeStorage.decryptString(
      Buffer.from(apiKeyRecord.encryptedKey, 'base64')
    )

    return decrypted
  }

  async exists(): Promise<boolean> {
    const count = await this.db.prisma.apiKey.count({
      where: { provider: 'openai' }
    })
    return count > 0
  }
}
```

---

## 2. VoltAgent Tools

### File Reader Tool

**File:** `lib/main/services/voltagent/tools/file-reader.tool.ts`

```typescript
import { createTool } from '@voltagent/core'
import { z } from 'zod'
import fs from 'fs/promises'

export const fileReaderTool = createTool({
  name: 'read_file',
  description: 'Read content from an uploaded file by file ID',
  parameters: z.object({
    fileId: z.string().describe('The ID of the file to read'),
  }),
  execute: async ({ fileId }, context) => {
    // Get file from database
    const db = context.db // We'll pass this in context
    const file = await db.prisma.file.findUnique({
      where: { id: fileId }
    })

    if (!file) {
      throw new Error(`File not found: ${fileId}`)
    }

    // Read file content
    const content = await fs.readFile(file.localPath, 'utf-8')

    return {
      filename: file.originalName,
      content,
      mimeType: file.mimeType
    }
  },
})
```

### Document Parser Tool

**File:** `lib/main/services/voltagent/tools/document-parser.tool.ts`

```typescript
import { createTool } from '@voltagent/core'
import { z } from 'zod'

export const documentParserTool = createTool({
  name: 'parse_document',
  description: 'Extract structured information from document text',
  parameters: z.object({
    content: z.string().describe('Document content to parse'),
    fields: z.array(z.string()).describe('Fields to extract (e.g., project_name, location, discharge_type)')
  }),
  execute: async ({ content, fields }) => {
    // Simple extraction - in production, could use more sophisticated parsing
    const extracted: Record<string, string> = {}

    for (const field of fields) {
      // Look for patterns like "Project Name: XYZ"
      const pattern = new RegExp(`${field.replace(/_/g, ' ')}:?\\s*(.+?)(?:\\n|$)`, 'i')
      const match = content.match(pattern)
      if (match) {
        extracted[field] = match[1].trim()
      }
    }

    return {
      fields: extracted,
      success: Object.keys(extracted).length > 0
    }
  },
})
```

### File Saver Tool

**File:** `lib/main/services/voltagent/tools/file-saver.tool.ts`

```typescript
import { createTool } from '@voltagent/core'
import { z } from 'zod'
import { nanoid } from 'nanoid'

export const fileSaverTool = createTool({
  name: 'save_file',
  description: 'Save generated content as a file',
  parameters: z.object({
    content: z.string().describe('Content to save'),
    filename: z.string().describe('Filename (e.g., executive-summary.md)'),
    category: z.string().optional().describe('File category'),
  }),
  execute: async ({ content, filename, category }, context) => {
    const fileService = context.fileService
    const workflowRunId = context.workflowRunId

    const file = await fileService.saveGenerated(
      workflowRunId,
      content,
      filename,
      category || 'generated'
    )

    return {
      fileId: file.id,
      filename: file.filename,
      path: file.localPath
    }
  },
})
```

---

## 3. VoltAgent Agents

### Section Writer Agent

**File:** `lib/main/services/voltagent/agents/section-writer.agent.ts`

```typescript
import { Agent, Memory } from '@voltagent/core'
import { openai } from '@ai-sdk/openai'
import { LibSQLMemoryAdapter } from '@voltagent/core/memory'
import { app } from 'electron'
import path from 'path'
import { fileReaderTool, documentParserTool, fileSaverTool } from '../tools'

export function createSectionWriterAgent() {
  return new Agent({
    name: 'section-writer',
    instructions: `You are an expert technical writer specializing in engineering reports for environmental permits.

Your role is to:
- Write clear, professional technical documentation
- Follow regulatory requirements and standards
- Use formal technical language appropriate for regulatory review
- Cite data and sources appropriately
- Organize information logically

When writing sections:
1. Review all available supporting documents
2. Extract relevant information using the parse_document tool
3. Write the section with proper technical depth
4. Save the completed section using save_file tool`,
    model: openai('gpt-4o'),
    tools: [fileReaderTool, documentParserTool, fileSaverTool],
    memory: new Memory({
      storage: new LibSQLMemoryAdapter({
        url: `file:${path.join(app.getPath('userData'), '.voltagent/memory.db')}`
      })
    })
  })
}
```

### Document Generator Agent

**File:** `lib/main/services/voltagent/agents/document-generator.agent.ts`

```typescript
import { Agent, Memory } from '@voltagent/core'
import { openai } from '@ai-sdk/openai'
import { LibSQLMemoryAdapter } from '@voltagent/core/memory'
import { app } from 'electron'
import path from 'path'
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

Output documents in well-formatted Markdown.`,
    model: openai('gpt-4o'),
    tools: [fileReaderTool, fileSaverTool],
    memory: new Memory({
      storage: new LibSQLMemoryAdapter({
        url: `file:${path.join(app.getPath('userData'), '.voltagent/memory.db')}`
      })
    })
  })
}
```

### Reviewer Agent

**File:** `lib/main/services/voltagent/agents/reviewer.agent.ts`

```typescript
import { Agent, Memory } from '@voltagent/core'
import { openai } from '@ai-sdk/openai'
import { LibSQLMemoryAdapter } from '@voltagent/core/memory'
import { app } from 'electron'
import path from 'path'
import { fileReaderTool } from '../tools'

export function createReviewerAgent() {
  return new Agent({
    name: 'reviewer',
    instructions: `You are a quality control specialist for engineering documents.

Your role is to:
- Review technical documents for completeness
- Check for technical accuracy and consistency
- Identify missing information or unclear sections
- Suggest improvements
- Verify regulatory compliance

Provide structured feedback with:
- Overall assessment
- Specific issues found
- Recommendations for improvement
- Missing elements`,
    model: openai('gpt-4o-mini'), // Use cheaper model for review
    tools: [fileReaderTool],
    memory: new Memory({
      storage: new LibSQLMemoryAdapter({
        url: `file:${path.join(app.getPath('userData'), '.voltagent/memory.db')}`
      })
    })
  })
}
```

---

## 4. VoltAgent Workflows

### Discharge Permit Workflow

**File:** `lib/main/services/voltagent/workflows/discharge-permit.workflow.ts`

```typescript
import { createWorkflowChain } from '@voltagent/core'
import { z } from 'zod'
import { createSectionWriterAgent, createDocumentGeneratorAgent, createReviewerAgent } from '../agents'

// Input schema
const dischargePermitInput = z.object({
  workflowRunId: z.string(),
  uploadedFileIds: z.array(z.string()),
  projectInfo: z.object({
    name: z.string().optional(),
    location: z.string().optional(),
    dischargeType: z.string().optional(),
  }).optional(),
})

// Result schema
const dischargePermitResult = z.object({
  sections: z.array(z.object({
    name: z.string(),
    fileId: z.string(),
  })),
  finalDocument: z.object({
    fileId: z.string(),
    filename: z.string(),
  }),
  review: z.object({
    passed: z.boolean(),
    feedback: z.string(),
  }).optional(),
})

export const dischargePermitWorkflow = createWorkflowChain({
  id: 'discharge-permit-engineers-report',
  input: dischargePermitInput,
  result: dischargePermitResult,
})
  // Step 1: Generate Executive Summary
  .andAgent({
    agent: createSectionWriterAgent(),
    execute: async ({ data, agent, context }) => {
      const fileIds = data.uploadedFileIds.join(', ')

      const result = await agent.run(
        `Generate an Executive Summary for an Engineer's Report for a wastewater discharge permit.

Uploaded supporting documents: ${fileIds}

Use read_file tool to review the uploaded documents.
Extract project information using parse_document tool.
Write a comprehensive executive summary (2-3 pages) covering:
- Project overview
- Discharge characteristics
- Treatment approach
- Key findings and recommendations

Save the result as "executive-summary.md" using save_file tool with category "engineers_report_section".`,
        { context }
      )

      return {
        sectionName: 'Executive Summary',
        completed: true,
      }
    }
  })

  // Step 2: Generate Project Description
  .andAgent({
    agent: createSectionWriterAgent(),
    execute: async ({ data, agent, context }) => {
      const result = await agent.run(
        `Generate the Project Description section for the Engineer's Report.

This section should include:
- Detailed project location and setting
- Facility description
- Process description
- Wastewater generation sources

Use the uploaded documents for reference.
Save as "project-description.md" with category "engineers_report_section".`,
        { context }
      )

      return {
        sectionName: 'Project Description',
        completed: true,
      }
    }
  })

  // Step 3: Generate Wastewater Characterization
  .andAgent({
    agent: createSectionWriterAgent(),
    execute: async ({ data, agent, context }) => {
      const result = await agent.run(
        `Generate the Wastewater Characterization section.

Include:
- Flow rates and variations
- Wastewater quality parameters
- Pollutant concentrations
- Sampling data analysis

Save as "wastewater-characterization.md" with category "engineers_report_section".`,
        { context }
      )

      return {
        sectionName: 'Wastewater Characterization',
        completed: true,
      }
    }
  })

  // Step 4: Generate Treatment System Design
  .andAgent({
    agent: createSectionWriterAgent(),
    execute: async ({ data, agent, context }) => {
      const result = await agent.run(
        `Generate the Treatment System Design section.

Include:
- Treatment process description
- Design criteria and calculations
- Equipment specifications
- Performance expectations

Save as "treatment-design.md" with category "engineers_report_section".`,
        { context }
      )

      return {
        sectionName: 'Treatment System Design',
        completed: true,
      }
    }
  })

  // Step 5: Generate Compliance Analysis
  .andAgent({
    agent: createSectionWriterAgent(),
    execute: async ({ data, agent, context }) => {
      const result = await agent.run(
        `Generate the Regulatory Compliance Analysis section.

Include:
- Applicable regulations and standards
- Discharge limits analysis
- Compliance demonstration
- Monitoring requirements

Save as "compliance-analysis.md" with category "engineers_report_section".`,
        { context }
      )

      return {
        sectionName: 'Compliance Analysis',
        completed: true,
      }
    }
  })

  // Step 6: Compile Final Document
  .andAgent({
    agent: createDocumentGeneratorAgent(),
    execute: async ({ data, agent, context }) => {
      const result = await agent.run(
        `Compile the complete Engineer's Report from all generated sections.

Read all section files:
- executive-summary.md
- project-description.md
- wastewater-characterization.md
- treatment-design.md
- compliance-analysis.md

Create a complete, well-formatted document with:
- Title page
- Table of contents
- All sections in order
- Consistent formatting
- Page numbers (indicate in markdown)
- Professional layout

Save as "engineers-report-complete.md" with category "engineers_report_final".`,
        { context }
      )

      return {
        finalDocument: {
          fileId: 'extracted-from-result', // Extract from agent result
          filename: 'engineers-report-complete.md',
        }
      }
    }
  })

  // Step 7: Optional Review
  .andWhen({
    condition: ({ data }) => {
      // Only run review if requested (could be user setting)
      return data.projectInfo?.enableReview === true
    },
    then: (chain) => chain.andAgent({
      agent: createReviewerAgent(),
      execute: async ({ data, agent, context }) => {
        const result = await agent.run(
          `Review the final Engineer's Report for quality and completeness.

Read the file "engineers-report-complete.md" and provide:
1. Overall quality assessment
2. Completeness check
3. Technical accuracy review
4. Recommendations for improvement

Format your response as a structured review.`,
          { context }
        )

        return {
          review: {
            passed: true, // Parse from result
            feedback: result.content || '',
          }
        }
      }
    })
  })
```

### Workflow Index

**File:** `lib/main/services/voltagent/workflows/index.ts`

```typescript
import { dischargePermitWorkflow } from './discharge-permit.workflow'

export const workflows = {
  'discharge-permit': dischargePermitWorkflow,
  // Add more workflows here
}

export type WorkflowId = keyof typeof workflows
```

---

## 5. VoltAgent Service (Main Orchestrator)

**File:** `lib/main/services/voltagent/index.ts`

```typescript
import { app } from 'electron'
import path from 'path'
import fs from 'fs/promises'
import { DatabaseService } from '../database.service'
import { FileService } from '../file.service'
import { workflows, WorkflowId } from './workflows'

export class VoltAgentService {
  private memoryPath: string

  constructor(
    private db: DatabaseService,
    private files: FileService
  ) {
    this.memoryPath = path.join(app.getPath('userData'), '.voltagent')
  }

  async initialize() {
    // Ensure VoltAgent memory directory exists
    await fs.mkdir(this.memoryPath, { recursive: true })
    console.log('VoltAgent initialized')
  }

  /**
   * Execute a workflow
   */
  async executeWorkflow(
    workflowId: WorkflowId,
    runId: string,
    input: any
  ) {
    const workflow = workflows[workflowId]
    if (!workflow) {
      throw new Error(`Workflow not found: ${workflowId}`)
    }

    // Create context for tools
    const context = {
      db: this.db,
      fileService: this.files,
      workflowRunId: runId,
    }

    // Update run status
    await this.db.prisma.workflowRun.update({
      where: { id: runId },
      data: { status: 'running' }
    })

    const startTime = Date.now()

    try {
      // Execute the workflow
      const result = await workflow.execute({
        ...input,
        workflowRunId: runId,
      }, { context })

      const executionTime = Date.now() - startTime

      // Update run with results
      await this.db.prisma.workflowRun.update({
        where: { id: runId },
        data: {
          status: 'completed',
          output: result,
          executionTime,
          completedAt: new Date(),
        }
      })

      return result
    } catch (error) {
      // Handle error
      await this.db.prisma.workflowRun.update({
        where: { id: runId },
        data: {
          status: 'failed',
          error: error.message,
          executionTime: Date.now() - startTime,
        }
      })

      throw error
    }
  }

  /**
   * Get available workflows
   */
  getWorkflows() {
    return Object.keys(workflows).map(id => ({
      id,
      name: workflows[id].id,
    }))
  }
}
```

---

## 6. Service Manager & Initialization

**File:** `lib/main/services/service-manager.ts`

```typescript
import { DatabaseService } from './database.service'
import { FileService } from './file.service'
import { ApiKeyService } from './api-key.service'
import { VoltAgentService } from './voltagent'

class ServiceManager {
  private services = new Map<string, any>()

  register(name: string, service: any) {
    this.services.set(name, service)
  }

  get<T>(name: string): T {
    const service = this.services.get(name)
    if (!service) {
      throw new Error(`Service not found: ${name}`)
    }
    return service
  }
}

export const serviceManager = new ServiceManager()

export async function initializeServices() {
  // 1. Database
  const db = new DatabaseService()
  await db.initialize()
  serviceManager.register('database', db)

  // 2. File Service
  const files = new FileService(db)
  await files.initialize()
  serviceManager.register('files', files)

  // 3. API Key Service
  const apiKeys = new ApiKeyService(db)
  serviceManager.register('apiKeys', apiKeys)

  // 4. Load API key into environment
  const openaiKey = await apiKeys.get()
  if (openaiKey) {
    process.env.OPENAI_API_KEY = openaiKey
  } else {
    console.warn('No OpenAI API key found - VoltAgent features will be limited')
  }

  // 5. VoltAgent Service
  const voltAgent = new VoltAgentService(db, files)
  await voltAgent.initialize()
  serviceManager.register('voltAgent', voltAgent)

  console.log('All services initialized')
}
```

---

## 7. Conveyor Integration

### IPC Schemas

**File:** `lib/conveyor/schemas/workflow-schema.ts`

```typescript
import { z } from 'zod'

export const workflowIpcSchema = {
  // Workflow management
  'workflow:list-available': {
    args: z.tuple([]),
    return: z.array(z.object({
      id: z.string(),
      name: z.string(),
    })),
  },
  'workflow:create-run': {
    args: z.tuple([z.string(), z.any()]),
    return: z.object({ runId: z.string() }),
  },
  'workflow:execute': {
    args: z.tuple([z.string()]), // runId
    return: z.any(),
  },
  'workflow:list-runs': {
    args: z.tuple([]),
    return: z.array(z.any()),
  },
  'workflow:get-run': {
    args: z.tuple([z.string()]),
    return: z.any(),
  },

  // File management
  'file:upload': {
    args: z.tuple([
      z.string(), // runId
      z.string(), // filename
      z.instanceof(Uint8Array), // data
      z.string().optional() // category
    ]),
    return: z.object({ fileId: z.string() }),
  },
  'file:list': {
    args: z.tuple([z.string()]), // runId
    return: z.array(z.any()),
  },
  'file:read': {
    args: z.tuple([z.string()]), // fileId
    return: z.instanceof(Uint8Array),
  },

  // API Key management
  'api-key:save': {
    args: z.tuple([z.string()]),
    return: z.boolean(),
  },
  'api-key:exists': {
    args: z.tuple([]),
    return: z.boolean(),
  },
} as const
```

### Handlers

**File:** `lib/conveyor/handlers/workflow-handler.ts`

```typescript
import { handle } from '@/lib/main/shared'
import { serviceManager } from '@/lib/main/services/service-manager'
import { VoltAgentService } from '@/lib/main/services/voltagent'
import { FileService } from '@/lib/main/services/file.service'
import { ApiKeyService } from '@/lib/main/services/api-key.service'
import { DatabaseService } from '@/lib/main/services/database.service'
import { WorkflowId } from '@/lib/main/services/voltagent/workflows'

export function registerWorkflowHandlers() {
  const voltAgent = serviceManager.get<VoltAgentService>('voltAgent')
  const files = serviceManager.get<FileService>('files')
  const apiKeys = serviceManager.get<ApiKeyService>('apiKeys')
  const db = serviceManager.get<DatabaseService>('database')

  // Workflow handlers
  handle('workflow:list-available', async () => {
    return voltAgent.getWorkflows()
  })

  handle('workflow:create-run', async (workflowId: WorkflowId, input: any) => {
    const run = await db.prisma.workflowRun.create({
      data: {
        workflowId,
        workflowName: workflowId,
        status: 'pending',
        input,
      }
    })

    return { runId: run.id }
  })

  handle('workflow:execute', async (runId: string) => {
    const run = await db.prisma.workflowRun.findUnique({
      where: { id: runId }
    })

    if (!run) {
      throw new Error('Workflow run not found')
    }

    const result = await voltAgent.executeWorkflow(
      run.workflowId as WorkflowId,
      runId,
      run.input
    )

    return result
  })

  handle('workflow:list-runs', async () => {
    return db.prisma.workflowRun.findMany({
      include: { files: true },
      orderBy: { createdAt: 'desc' }
    })
  })

  handle('workflow:get-run', async (runId: string) => {
    return db.prisma.workflowRun.findUnique({
      where: { id: runId },
      include: { files: true }
    })
  })

  // File handlers
  handle('file:upload', async (
    runId: string,
    filename: string,
    data: Uint8Array,
    category?: string
  ) => {
    const buffer = Buffer.from(data)
    const file = await files.saveUpload(runId, buffer, filename, category)
    return { fileId: file.id }
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
    await apiKeys.save(key)
    // Set in environment
    process.env.OPENAI_API_KEY = key
    return true
  })

  handle('api-key:exists', async () => {
    return apiKeys.exists()
  })
}
```

---

## Key Improvements Over v1

### ✅ Proper VoltAgent Usage
- **No server needed** - VoltAgent runs directly in Electron
- **Agents with memory** - Using LibSQL for persistent memory
- **Proper tool definitions** - Using `createTool()` API
- **VoltAgent workflows** - Using `createWorkflowChain()` instead of custom system
- **Context passing** - Tools receive database and file service via context

### ✅ Better Architecture
- **Separated concerns**: Tools, Agents, Workflows in separate files
- **Type-safe workflows**: Using Zod schemas for input/output
- **Built-in observability**: VoltAgent tracks execution automatically
- **Reusable components**: Agents and tools can be used across workflows

### ✅ Simplified Database
- **No AgentTrace table** - VoltAgent handles this internally
- **Simpler WorkflowRun** - Just tracking VoltAgent workflow executions
- **Focused on file management** - Core competency

---

## Next Steps

1. **Install VoltAgent dependencies**:
   ```bash
   npm install @voltagent/core @ai-sdk/openai @libsql/client
   ```

2. **Set up services** in initialization order

3. **Test individual agents** before building workflows

4. **Build UI** for workflow execution

5. **Create workflow configuration UI** (optional - can hard-code workflows initially)

This architecture is much more aligned with VoltAgent best practices and will be easier to maintain and extend!
