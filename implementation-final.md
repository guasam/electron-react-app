# Implementation Plan: Production-Ready Workflow Tool with VoltAgent

## Executive Summary

Comprehensive implementation plan for an Electron-based workflow automation tool using VoltAgent for AI orchestration. Focused on document generation workflows (e.g., Engineer's Reports) with robust error handling, progress tracking, and human-in-the-loop capabilities.

**Key Features:**
- ✅ VoltAgent-native workflows with persistent memory
- ✅ Modular tools, agents, and workflows
- ✅ Real-time progress tracking and streaming
- ✅ Human review and approval steps
- ✅ File versioning and audit trail
- ✅ Comprehensive error handling and recovery
- ✅ Production deployment strategy

---

## Table of Contents

1. [Core Stack](#core-stack)
2. [Database Schema](#database-schema)
3. [Architecture Deep Dive](#architecture-deep-dive)
4. [VoltAgent Layer](#voltagent-layer)
5. [Error Handling & Recovery](#error-handling--recovery)
6. [Progress Tracking & Streaming](#progress-tracking--streaming)
7. [Human-in-the-Loop](#human-in-the-loop)
8. [File Management](#file-management)
9. [Configuration Management](#configuration-management)
10. [Testing Strategy](#testing-strategy)
11. [Deployment](#deployment)
12. [Security](#security)

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
    "@libsql/client": "^0.x",

    // File handling & parsing
    "mime-types": "^2.x",
    "pdf-parse": "^1.x",        // PDF extraction
    "mammoth": "^1.x",          // DOCX parsing
    "xlsx": "^0.x",             // Excel parsing

    // Utilities
    "zod": "^3.x",
    "nanoid": "^5.x",
    "date-fns": "^3.x",
    "eventemitter3": "^5.x"     // For progress events
  },
  "devDependencies": {
    "vitest": "^1.x",
    "@playwright/test": "^1.x"
  }
}
```

### Node Version
- **Required:** Node.js 20.19+ (VoltAgent requirement)

---

## Database Schema

### File: `prisma/schema.prisma`

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "sqlite"
  url      = "file:./app.db"
}

// ==========================================
// API Key Management
// ==========================================

model ApiKey {
  id           String   @id @default(uuid())
  provider     String   @default("openai")
  encryptedKey String   // Encrypted with Electron safeStorage
  isActive     Boolean  @default(true)
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt

  @@unique([provider]) // Only one key per provider
}

// ==========================================
// Workflow Definitions
// ==========================================

model WorkflowDefinition {
  id          String   @id // e.g., "discharge-permit"
  name        String   // Display name
  description String?
  version     String   @default("1.0.0")
  config      Json     // Workflow configuration
  schema      Json     // Input/output schemas
  isActive    Boolean  @default(true)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  runs WorkflowRun[]
}

// ==========================================
// Workflow Execution
// ==========================================

model WorkflowRun {
  id                String   @id @default(uuid())
  workflowId        String
  workflowVersion   String
  status            String   // pending, running, paused, completed, failed, cancelled
  currentStep       Int      @default(0)
  totalSteps        Int
  input             Json     // Workflow input parameters
  output            Json?    // Final workflow result
  error             String?  // Error message if failed
  executionTimeMs   Int?
  pausedAt          DateTime?
  pausedReason      String?  // human_review, approval_needed, etc.
  resumeData        Json?    // Data needed to resume
  createdAt         DateTime @default(now())
  startedAt         DateTime?
  completedAt       DateTime?
  createdBy         String   @default("system") // Future: user tracking

  workflow    WorkflowDefinition @relation(fields: [workflowId], references: [id])
  files       File[]
  steps       WorkflowStep[]
  reviews     HumanReview[]

  @@index([workflowId, createdAt])
  @@index([status])
}

// ==========================================
// Workflow Step Tracking
// ==========================================

model WorkflowStep {
  id              String   @id @default(uuid())
  workflowRunId   String
  stepIndex       Int      // 0-based step number
  stepName        String   // e.g., "generate_executive_summary"
  stepType        String   // agent, function, condition
  status          String   // pending, running, completed, failed, skipped
  input           Json?    // Step input
  output          Json?    // Step output
  error           String?
  executionTimeMs Int?
  retryCount      Int      @default(0)
  maxRetries      Int      @default(3)
  createdAt       DateTime @default(now())
  startedAt       DateTime?
  completedAt     DateTime?

  workflowRun WorkflowRun @relation(fields: [workflowRunId], references: [id], onDelete: Cascade)

  @@unique([workflowRunId, stepIndex])
  @@index([workflowRunId, status])
}

// ==========================================
// File Management
// ==========================================

model File {
  id            String   @id @default(uuid())
  workflowRunId String
  filename      String   // Stored filename (with ID)
  originalName  String   // User's original filename
  mimeType      String
  size          Int
  fileType      String   // upload, generated, intermediate
  category      String   // supporting_doc, engineers_report_section, engineers_report_final
  version       Int      @default(1)
  parentFileId  String?  // For versioning
  localPath     String   // Absolute path on disk
  hash          String?  // SHA-256 hash for deduplication
  metadata      Json     @default("{}")
  extractedText String?  // Extracted text for AI processing
  createdAt     DateTime @default(now())
  createdBy     String   @default("system")

  workflowRun WorkflowRun @relation(fields: [workflowRunId], references: [id], onDelete: Cascade)
  parentFile  File?       @relation("FileVersions", fields: [parentFileId], references: [id])
  versions    File[]      @relation("FileVersions")

  @@index([workflowRunId, fileType])
  @@index([hash])
}

// ==========================================
// Human-in-the-Loop
// ==========================================

model HumanReview {
  id            String   @id @default(uuid())
  workflowRunId String
  reviewType    String   // approval, feedback, correction
  title         String
  description   String?
  status        String   // pending, approved, rejected, revised
  contextData   Json     @default("{}")  // Data for reviewer
  reviewerNotes String?
  decision      String?  // approved, rejected, needs_revision
  submittedAt   DateTime?
  createdAt     DateTime @default(now())

  workflowRun WorkflowRun @relation(fields: [workflowRunId], references: [id], onDelete: Cascade)

  @@index([workflowRunId, status])
}

// ==========================================
// System Configuration
// ==========================================

model SystemConfig {
  key       String   @id
  value     Json
  updatedAt DateTime @updatedAt
}
```

### Migration Strategy

```bash
# Development
npx prisma db push

# Production
npx prisma migrate deploy
```

**Initial Seed Data:**
```typescript
// Create default workflow definition
await prisma.workflowDefinition.create({
  data: {
    id: 'discharge-permit',
    name: 'Discharge Permit - Engineer\'s Report',
    description: 'Generate comprehensive engineer\'s report for wastewater discharge permits',
    version: '1.0.0',
    config: { /* workflow config */ },
    schema: { /* input/output schemas */ }
  }
})
```

---

## Architecture Deep Dive

### Directory Structure

```
lib/main/
├── services/
│   ├── core/
│   │   ├── database.service.ts
│   │   ├── file.service.ts
│   │   ├── api-key.service.ts
│   │   └── event-bus.service.ts        # NEW: Event communication
│   │
│   ├── workflow/
│   │   ├── workflow.service.ts          # Workflow orchestration
│   │   ├── workflow-executor.ts         # Execution engine
│   │   ├── workflow-state.manager.ts    # State management
│   │   └── workflow-recovery.service.ts # Error recovery
│   │
│   ├── voltagent/
│   │   ├── index.ts                     # VoltAgent service
│   │   │
│   │   ├── tools/
│   │   │   ├── index.ts                 # Tool registry
│   │   │   ├── file-reader.tool.ts
│   │   │   ├── document-parser.tool.ts
│   │   │   ├── file-saver.tool.ts
│   │   │   ├── pdf-extractor.tool.ts    # NEW
│   │   │   ├── docx-parser.tool.ts      # NEW
│   │   │   └── template-loader.tool.ts  # NEW
│   │   │
│   │   ├── agents/
│   │   │   ├── index.ts                 # Agent registry
│   │   │   ├── section-writer.agent.ts
│   │   │   ├── document-generator.agent.ts
│   │   │   ├── reviewer.agent.ts
│   │   │   ├── data-extractor.agent.ts  # NEW: Extract structured data
│   │   │   └── validator.agent.ts       # NEW: Validate outputs
│   │   │
│   │   └── workflows/
│   │       ├── index.ts
│   │       ├── discharge-permit.workflow.ts
│   │       ├── workflow-templates/       # NEW: Reusable configs
│   │       │   ├── section-templates.ts
│   │       │   └── prompt-templates.ts
│   │       └── workflow-utils.ts         # NEW: Shared utilities
│   │
│   └── service-manager.ts
│
├── lib/
│   ├── errors/
│   │   ├── workflow-errors.ts           # Custom error types
│   │   ├── error-handler.ts
│   │   └── retry-strategies.ts
│   │
│   └── utils/
│       ├── file-processing.ts
│       ├── text-extraction.ts
│       └── validation.ts
│
└── types/
    ├── workflow.types.ts
    ├── agent.types.ts
    └── file.types.ts
```

### Service Dependency Graph

```
EventBus (base)
    ↓
Database (uses EventBus)
    ↓
ApiKey (uses Database)
    ↓
File (uses Database, EventBus)
    ↓
VoltAgent (uses Database, File, EventBus)
    ↓
Workflow (uses VoltAgent, File, Database, EventBus)
```

---

## VoltAgent Layer

### 1. Tool Definitions (Enhanced)

#### PDF Extractor Tool
**File:** `lib/main/services/voltagent/tools/pdf-extractor.tool.ts`

```typescript
import { createTool } from '@voltagent/core'
import { z } from 'zod'
import pdfParse from 'pdf-parse'
import fs from 'fs/promises'

export const pdfExtractorTool = createTool({
  name: 'extract_pdf',
  description: 'Extract text content from PDF files with page metadata',
  parameters: z.object({
    fileId: z.string().describe('File ID to extract from'),
    pages: z.array(z.number()).optional().describe('Specific pages to extract (1-indexed)'),
  }),
  execute: async ({ fileId, pages }, context) => {
    const db = context.db
    const file = await db.prisma.file.findUnique({ where: { id: fileId } })

    if (!file) throw new Error(`File not found: ${fileId}`)
    if (file.mimeType !== 'application/pdf') {
      throw new Error(`File is not a PDF: ${file.mimeType}`)
    }

    const buffer = await fs.readFile(file.localPath)
    const data = await pdfParse(buffer)

    // Filter pages if specified
    let text = data.text
    if (pages && pages.length > 0) {
      // Simple page extraction (production would need better parsing)
      const pageTexts = data.text.split('\f') // Form feed = page break
      text = pages.map(p => pageTexts[p - 1]).join('\n\n')
    }

    // Cache extracted text
    await db.prisma.file.update({
      where: { id: fileId },
      data: { extractedText: text }
    })

    return {
      text,
      pages: data.numpages,
      metadata: {
        title: data.info?.Title,
        author: data.info?.Author,
      }
    }
  },
})
```

#### Template Loader Tool
**File:** `lib/main/services/voltagent/tools/template-loader.tool.ts`

```typescript
import { createTool } from '@voltagent/core'
import { z } from 'zod'
import { sectionTemplates } from '../workflows/workflow-templates/section-templates'

export const templateLoaderTool = createTool({
  name: 'load_template',
  description: 'Load a predefined section template with formatting guidelines',
  parameters: z.object({
    templateName: z.string().describe('Template name (e.g., executive_summary, project_description)'),
  }),
  execute: async ({ templateName }) => {
    const template = sectionTemplates[templateName]

    if (!template) {
      return {
        error: `Template not found: ${templateName}`,
        available: Object.keys(sectionTemplates)
      }
    }

    return {
      structure: template.structure,
      guidelines: template.guidelines,
      example: template.example,
      minLength: template.minLength,
      maxLength: template.maxLength,
    }
  },
})
```

#### Smart Document Parser
**File:** `lib/main/services/voltagent/tools/document-parser.tool.ts`

```typescript
import { createTool } from '@voltagent/core'
import { z } from 'zod'

export const documentParserTool = createTool({
  name: 'parse_document',
  description: 'Extract structured information from document text using patterns and AI',
  parameters: z.object({
    fileId: z.string().describe('File ID to parse'),
    schema: z.record(z.string()).describe('Fields to extract with descriptions'),
    useAI: z.boolean().optional().describe('Use AI for intelligent extraction'),
  }),
  execute: async ({ fileId, schema, useAI }, context) => {
    const db = context.db
    const file = await db.prisma.file.findUnique({ where: { id: fileId } })

    if (!file) throw new Error(`File not found: ${fileId}`)

    let text = file.extractedText
    if (!text) {
      // Extract text if not cached
      const content = await fs.readFile(file.localPath, 'utf-8')
      text = content
    }

    const extracted: Record<string, any> = {}

    if (useAI) {
      // Use a lightweight agent for extraction
      const dataExtractor = context.agentRegistry.get('data-extractor')
      const prompt = `Extract the following fields from this document:
${Object.entries(schema).map(([key, desc]) => `- ${key}: ${desc}`).join('\n')}

Document:
${text}

Return as JSON.`

      const result = await dataExtractor.run(prompt)
      Object.assign(extracted, JSON.parse(result.content || '{}'))
    } else {
      // Pattern-based extraction
      for (const [field, description] of Object.entries(schema)) {
        const pattern = new RegExp(`${field.replace(/_/g, ' ')}:?\\s*(.+?)(?:\\n|$)`, 'i')
        const match = text.match(pattern)
        if (match) {
          extracted[field] = match[1].trim()
        }
      }
    }

    return {
      fields: extracted,
      confidence: useAI ? 'high' : 'medium',
      source: file.originalName,
    }
  },
})
```

### 2. Agent Definitions (Enhanced)

#### Data Extractor Agent
**File:** `lib/main/services/voltagent/agents/data-extractor.agent.ts`

```typescript
import { Agent, Memory } from '@voltagent/core'
import { openai } from '@ai-sdk/openai'
import { LibSQLMemoryAdapter } from '@voltagent/core/memory'
import { getMemoryPath } from '../utils'

export function createDataExtractorAgent() {
  return new Agent({
    name: 'data-extractor',
    instructions: `You are a data extraction specialist.

Your role:
- Extract structured information from unstructured text
- Identify key data points, numbers, dates, entities
- Return information in JSON format
- Handle incomplete or ambiguous data gracefully

Always:
- Return valid JSON
- Include confidence scores when uncertain
- Note missing fields as null
- Preserve original units and formats`,
    model: openai('gpt-4o-mini'), // Faster, cheaper for extraction
    tools: [],
    memory: new Memory({
      storage: new LibSQLMemoryAdapter({
        url: `file:${getMemoryPath()}/memory.db`
      })
    })
  })
}
```

#### Validator Agent
**File:** `lib/main/services/voltagent/agents/validator.agent.ts`

```typescript
import { Agent, Memory } from '@voltagent/core'
import { openai } from '@ai-sdk/openai'
import { LibSQLMemoryAdapter } from '@voltagent/core/memory'
import { getMemoryPath } from '../utils'

export function createValidatorAgent() {
  return new Agent({
    name: 'validator',
    instructions: `You are a document validation specialist.

Your role:
- Check documents against requirements and templates
- Identify missing required sections
- Verify technical accuracy and consistency
- Ensure regulatory compliance
- Flag formatting issues

Validation checks:
1. Structure: All required sections present
2. Completeness: Sufficient detail in each section
3. Consistency: No contradictions between sections
4. Technical: Calculations and units are correct
5. Compliance: Meets regulatory standards

Return structured validation results with:
- Overall pass/fail status
- List of issues by severity (critical, warning, info)
- Specific recommendations for each issue`,
    model: openai('gpt-4o'),
    tools: [],
    memory: new Memory({
      storage: new LibSQLMemoryAdapter({
        url: `file:${getMemoryPath()}/memory.db`
      })
    })
  })
}
```

### 3. Agent Registry

**File:** `lib/main/services/voltagent/agents/index.ts`

```typescript
import { Agent } from '@voltagent/core'
import { createSectionWriterAgent } from './section-writer.agent'
import { createDocumentGeneratorAgent } from './document-generator.agent'
import { createReviewerAgent } from './reviewer.agent'
import { createDataExtractorAgent } from './data-extractor.agent'
import { createValidatorAgent } from './validator.agent'

export class AgentRegistry {
  private agents = new Map<string, Agent>()

  constructor() {
    this.initialize()
  }

  private initialize() {
    // Register all agents
    this.register('section-writer', createSectionWriterAgent())
    this.register('document-generator', createDocumentGeneratorAgent())
    this.register('reviewer', createReviewerAgent())
    this.register('data-extractor', createDataExtractorAgent())
    this.register('validator', createValidatorAgent())
  }

  register(name: string, agent: Agent) {
    this.agents.set(name, agent)
  }

  get(name: string): Agent {
    const agent = this.agents.get(name)
    if (!agent) {
      throw new Error(`Agent not found: ${name}`)
    }
    return agent
  }

  list(): string[] {
    return Array.from(this.agents.keys())
  }
}
```

### 4. Tool Registry

**File:** `lib/main/services/voltagent/tools/index.ts`

```typescript
import { fileReaderTool } from './file-reader.tool'
import { documentParserTool } from './document-parser.tool'
import { fileSaverTool } from './file-saver.tool'
import { pdfExtractorTool } from './pdf-extractor.tool'
import { templateLoaderTool } from './template-loader.tool'

export const toolRegistry = {
  'read_file': fileReaderTool,
  'parse_document': documentParserTool,
  'save_file': fileSaverTool,
  'extract_pdf': pdfExtractorTool,
  'load_template': templateLoaderTool,
}

export type ToolName = keyof typeof toolRegistry

// Helper to get tools by category
export const getToolsByCategory = (category: 'file' | 'document' | 'template') => {
  const categoryMap = {
    file: ['read_file', 'save_file', 'extract_pdf'],
    document: ['parse_document'],
    template: ['load_template'],
  }
  return categoryMap[category].map(name => toolRegistry[name])
}
```

### 5. Workflow Templates

**File:** `lib/main/services/voltagent/workflows/workflow-templates/section-templates.ts`

```typescript
export const sectionTemplates = {
  executive_summary: {
    structure: [
      'Project Overview',
      'Purpose and Scope',
      'Key Findings',
      'Recommendations',
    ],
    guidelines: `
- Length: 2-3 pages
- Audience: Technical reviewers and decision makers
- Style: Professional, concise, no jargon
- Include: Project name, location, permit type, key conclusions
    `,
    minLength: 800,
    maxLength: 1500,
    example: `
# Executive Summary

## Project Overview
[Brief description of project and facility]

## Purpose and Scope
[Why this report is being prepared, what it covers]

## Key Findings
[Main technical findings and analyses]

## Recommendations
[Primary recommendations for permit approval]
    `
  },

  project_description: {
    structure: [
      'Project Location',
      'Facility Description',
      'Process Description',
      'Wastewater Sources',
    ],
    guidelines: `
- Length: 3-5 pages
- Include: Maps, diagrams, flow charts
- Detail: Specific equipment, capacities, operations
- Context: Historical background if applicable
    `,
    minLength: 1500,
    maxLength: 3000,
  },

  wastewater_characterization: {
    structure: [
      'Flow Characteristics',
      'Quality Parameters',
      'Pollutant Analysis',
      'Sampling Data',
    ],
    guidelines: `
- Length: 4-6 pages
- Required: Tables of analytical data
- Include: Statistical analysis, trends
- Units: Consistent throughout (mg/L, gpd, etc.)
    `,
    minLength: 2000,
    maxLength: 4000,
  },

  treatment_design: {
    structure: [
      'Treatment Process Overview',
      'Design Criteria',
      'Engineering Calculations',
      'Equipment Specifications',
      'Performance Expectations',
    ],
    guidelines: `
- Length: 6-10 pages
- Required: Detailed calculations, design drawings
- Include: Safety factors, redundancy, O&M considerations
- Standards: Reference applicable design standards
    `,
    minLength: 3000,
    maxLength: 6000,
  },

  compliance_analysis: {
    structure: [
      'Applicable Regulations',
      'Discharge Standards',
      'Compliance Demonstration',
      'Monitoring Plan',
    ],
    guidelines: `
- Length: 3-5 pages
- Required: Cite specific regulations by number
- Include: Comparison tables (limits vs. expected performance)
- Detail: Monitoring frequency, methods, reporting
    `,
    minLength: 1500,
    maxLength: 3000,
  },
}

export type SectionTemplateName = keyof typeof sectionTemplates
```

**File:** `lib/main/services/voltagent/workflows/workflow-templates/prompt-templates.ts`

```typescript
export const promptTemplates = {
  generateSection: (sectionName: string, template: any, context: any) => `
Generate the "${sectionName}" section for an Engineer's Report.

## Template Structure
${template.structure.join('\n')}

## Guidelines
${template.guidelines}

## Length Requirements
- Minimum: ${template.minLength} words
- Maximum: ${template.maxLength} words

## Available Information
${JSON.stringify(context, null, 2)}

## Instructions
1. Review uploaded documents using read_file tool
2. Extract relevant data using parse_document tool
3. Follow the template structure exactly
4. Write in professional technical style
5. Include specific data, calculations, and citations
6. Save the result using save_file tool

Generate the complete section now.
  `,

  compileDocument: (sections: string[]) => `
Compile a complete Engineer's Report from the following sections:

${sections.map((s, i) => `${i + 1}. ${s}`).join('\n')}

Create a professional document with:
1. Title page
2. Table of Contents (with page numbers)
3. All sections in order
4. Consistent formatting (headings, lists, tables)
5. Page numbers
6. Professional layout

Use read_file to access each section.
Output as well-formatted Markdown.
Save as "engineers-report-complete.md" using save_file.
  `,

  validateDocument: (requirements: any) => `
Validate the Engineer's Report against the following requirements:

${JSON.stringify(requirements, null, 2)}

Check for:
1. All required sections present
2. Each section meets minimum length
3. Technical accuracy and consistency
4. Proper citations and references
5. Regulatory compliance
6. Formatting and structure

Return a structured validation report with:
- Overall pass/fail
- Issues found (by severity)
- Specific recommendations
- Missing elements
  `,
}
```

### 6. Enhanced Workflow

**File:** `lib/main/services/voltagent/workflows/discharge-permit.workflow.ts`

```typescript
import { createWorkflowChain } from '@voltagent/core'
import { z } from 'zod'
import { sectionTemplates } from './workflow-templates/section-templates'
import { promptTemplates } from './workflow-templates/prompt-templates'

// Input schema
const dischargePermitInput = z.object({
  workflowRunId: z.string(),
  uploadedFileIds: z.array(z.string()),
  projectInfo: z.object({
    name: z.string(),
    location: z.string().optional(),
    permitType: z.string().optional(),
    enableReview: z.boolean().optional(),
    enableValidation: z.boolean().optional(),
  }),
})

// Result schema
const dischargePermitResult = z.object({
  sections: z.array(z.object({
    name: z.string(),
    fileId: z.string(),
    status: z.string(),
  })),
  finalDocument: z.object({
    fileId: z.string(),
    filename: z.string(),
  }).optional(),
  validation: z.object({
    passed: z.boolean(),
    issues: z.array(z.any()),
    recommendations: z.array(z.string()),
  }).optional(),
  review: z.object({
    approved: z.boolean(),
    feedback: z.string(),
  }).optional(),
})

export const dischargePermitWorkflow = createWorkflowChain({
  id: 'discharge-permit-engineers-report',
  input: dischargePermitInput,
  result: dischargePermitResult,
})
  // Step 0: Extract and parse uploaded documents
  .andAgent({
    agent: 'data-extractor', // Reference by name from registry
    execute: async ({ data, agent, context }) => {
      const extractedData = {}

      for (const fileId of data.uploadedFileIds) {
        const result = await agent.run(
          `Extract key information from this document for a wastewater discharge permit application.

Extract:
- Project/facility name
- Location/address
- Discharge type and characteristics
- Flow rates
- Treatment systems
- Any regulatory references

Use read_file(${fileId}) to access the document.
Return as JSON.`,
          { context }
        )

        Object.assign(extractedData, JSON.parse(result.content || '{}'))
      }

      // Store extracted data in workflow context
      context.extractedData = extractedData

      return { extractedData }
    }
  })

  // Step 1-5: Generate all sections in parallel
  .andAll([
    // Executive Summary
    {
      agent: 'section-writer',
      execute: async ({ data, agent, context }) => {
        const template = sectionTemplates.executive_summary
        const prompt = promptTemplates.generateSection(
          'Executive Summary',
          template,
          {
            projectInfo: data.projectInfo,
            extractedData: context.extractedData,
            uploadedFiles: data.uploadedFileIds,
          }
        )

        await agent.run(prompt, { context })
        return { section: 'executive_summary' }
      }
    },

    // Project Description
    {
      agent: 'section-writer',
      execute: async ({ data, agent, context }) => {
        const template = sectionTemplates.project_description
        const prompt = promptTemplates.generateSection(
          'Project Description',
          template,
          { projectInfo: data.projectInfo, extractedData: context.extractedData }
        )

        await agent.run(prompt, { context })
        return { section: 'project_description' }
      }
    },

    // Wastewater Characterization
    {
      agent: 'section-writer',
      execute: async ({ data, agent, context }) => {
        const template = sectionTemplates.wastewater_characterization
        const prompt = promptTemplates.generateSection(
          'Wastewater Characterization',
          template,
          { extractedData: context.extractedData }
        )

        await agent.run(prompt, { context })
        return { section: 'wastewater_characterization' }
      }
    },

    // Treatment Design
    {
      agent: 'section-writer',
      execute: async ({ data, agent, context }) => {
        const template = sectionTemplates.treatment_design
        const prompt = promptTemplates.generateSection(
          'Treatment System Design',
          template,
          { extractedData: context.extractedData }
        )

        await agent.run(prompt, { context })
        return { section: 'treatment_design' }
      }
    },

    // Compliance Analysis
    {
      agent: 'section-writer',
      execute: async ({ data, agent, context }) => {
        const template = sectionTemplates.compliance_analysis
        const prompt = promptTemplates.generateSection(
          'Compliance Analysis',
          template,
          { extractedData: context.extractedData }
        )

        await agent.run(prompt, { context })
        return { section: 'compliance_analysis' }
      }
    },
  ])

  // Step 6: Compile final document
  .andAgent({
    agent: 'document-generator',
    execute: async ({ data, agent, context }) => {
      const sections = [
        'executive-summary.md',
        'project-description.md',
        'wastewater-characterization.md',
        'treatment-design.md',
        'compliance-analysis.md',
      ]

      const prompt = promptTemplates.compileDocument(sections)
      await agent.run(prompt, { context })

      return { compiled: true }
    }
  })

  // Step 7: Optional validation
  .andWhen({
    condition: ({ data }) => data.projectInfo?.enableValidation === true,
    then: (chain) => chain.andAgent({
      agent: 'validator',
      execute: async ({ data, agent, context }) => {
        const requirements = {
          requiredSections: Object.keys(sectionTemplates),
          minLengthPerSection: 800,
          mustInclude: ['calculations', 'citations', 'tables'],
        }

        const prompt = promptTemplates.validateDocument(requirements)
        const result = await agent.run(prompt, { context })

        const validation = JSON.parse(result.content || '{}')

        return {
          validation: {
            passed: validation.passed,
            issues: validation.issues || [],
            recommendations: validation.recommendations || [],
          }
        }
      }
    })
  })

  // Step 8: Human review (if requested)
  .andWhen({
    condition: ({ data }) => data.projectInfo?.enableReview === true,
    then: (chain) => chain.andThen({
      execute: async ({ data, context }) => {
        // Pause workflow for human review
        context.pauseForReview = true

        return {
          requiresHumanReview: true,
          reviewInstructions: 'Please review the generated report and provide feedback.',
        }
      }
    })
  })
```

---

## Error Handling & Recovery

### Custom Error Types

**File:** `lib/main/lib/errors/workflow-errors.ts`

```typescript
export class WorkflowError extends Error {
  constructor(
    message: string,
    public code: string,
    public recoverable: boolean = false,
    public context?: any
  ) {
    super(message)
    this.name = 'WorkflowError'
  }
}

export class AgentExecutionError extends WorkflowError {
  constructor(message: string, public agentName: string, context?: any) {
    super(message, 'AGENT_EXECUTION_FAILED', true, context)
    this.name = 'AgentExecutionError'
  }
}

export class ToolExecutionError extends WorkflowError {
  constructor(message: string, public toolName: string, context?: any) {
    super(message, 'TOOL_EXECUTION_FAILED', true, context)
    this.name = 'ToolExecutionError'
  }
}

export class FileProcessingError extends WorkflowError {
  constructor(message: string, public fileId: string, context?: any) {
    super(message, 'FILE_PROCESSING_FAILED', true, context)
    this.name = 'FileProcessingError'
  }
}

export class WorkflowValidationError extends WorkflowError {
  constructor(message: string, context?: any) {
    super(message, 'VALIDATION_FAILED', false, context)
    this.name = 'WorkflowValidationError'
  }
}
```

### Retry Strategies

**File:** `lib/main/lib/errors/retry-strategies.ts`

```typescript
export interface RetryStrategy {
  maxAttempts: number
  delayMs: number
  backoffMultiplier: number
  shouldRetry: (error: Error, attempt: number) => boolean
}

export const retryStrategies = {
  // For rate limit errors
  rateLimitRetry: {
    maxAttempts: 5,
    delayMs: 1000,
    backoffMultiplier: 2,
    shouldRetry: (error: Error) => {
      return error.message.includes('rate_limit') || error.message.includes('429')
    },
  },

  // For transient network errors
  networkRetry: {
    maxAttempts: 3,
    delayMs: 500,
    backoffMultiplier: 1.5,
    shouldRetry: (error: Error) => {
      return error.message.includes('ECONNRESET') ||
             error.message.includes('ETIMEDOUT') ||
             error.message.includes('network')
    },
  },

  // For agent errors (be conservative)
  agentRetry: {
    maxAttempts: 2,
    delayMs: 2000,
    backoffMultiplier: 1,
    shouldRetry: (error: Error, attempt: number) => {
      // Only retry once for agent errors
      return attempt < 1 && !(error.message.includes('validation') || error.message.includes('schema'))
    },
  },
}

export async function executeWithRetry<T>(
  fn: () => Promise<T>,
  strategy: RetryStrategy
): Promise<T> {
  let lastError: Error
  let attempt = 0

  while (attempt < strategy.maxAttempts) {
    try {
      return await fn()
    } catch (error) {
      lastError = error
      attempt++

      if (attempt >= strategy.maxAttempts || !strategy.shouldRetry(error, attempt)) {
        throw error
      }

      const delay = strategy.delayMs * Math.pow(strategy.backoffMultiplier, attempt - 1)
      await new Promise(resolve => setTimeout(resolve, delay))
    }
  }

  throw lastError!
}
```

### Workflow Recovery Service

**File:** `lib/main/services/workflow/workflow-recovery.service.ts`

```typescript
import { DatabaseService } from '../core/database.service'
import { EventBusService } from '../core/event-bus.service'

export class WorkflowRecoveryService {
  constructor(
    private db: DatabaseService,
    private eventBus: EventBusService
  ) {}

  /**
   * Resume failed workflow from last successful step
   */
  async recoverWorkflow(runId: string) {
    const run = await this.db.prisma.workflowRun.findUnique({
      where: { id: runId },
      include: { steps: { orderBy: { stepIndex: 'asc' } } }
    })

    if (!run) throw new Error('Workflow run not found')

    // Find last successful step
    const lastSuccess = run.steps
      .reverse()
      .find(step => step.status === 'completed')

    const resumeFromStep = lastSuccess ? lastSuccess.stepIndex + 1 : 0

    // Reset run status
    await this.db.prisma.workflowRun.update({
      where: { id: runId },
      data: {
        status: 'pending',
        currentStep: resumeFromStep,
        error: null,
      }
    })

    // Reset failed steps
    await this.db.prisma.workflowStep.updateMany({
      where: {
        workflowRunId: runId,
        stepIndex: { gte: resumeFromStep }
      },
      data: {
        status: 'pending',
        error: null,
      }
    })

    this.eventBus.emit('workflow:recovered', { runId, resumeFromStep })

    return { runId, resumeFromStep }
  }

  /**
   * Get recovery suggestions based on error
   */
  async getRecoverySuggestions(runId: string) {
    const run = await this.db.prisma.workflowRun.findUnique({
      where: { id: runId },
      include: { steps: { where: { status: 'failed' } } }
    })

    if (!run) throw new Error('Workflow run not found')

    const suggestions = []

    for (const step of run.steps) {
      if (step.error?.includes('rate_limit')) {
        suggestions.push({
          step: step.stepIndex,
          issue: 'Rate limit exceeded',
          suggestion: 'Wait a few minutes and retry',
          autoRecoverable: true,
        })
      } else if (step.error?.includes('file')) {
        suggestions.push({
          step: step.stepIndex,
          issue: 'File processing error',
          suggestion: 'Check uploaded files are valid and try again',
          autoRecoverable: false,
        })
      } else {
        suggestions.push({
          step: step.stepIndex,
          issue: step.error || 'Unknown error',
          suggestion: 'Review error logs and contact support if needed',
          autoRecoverable: false,
        })
      }
    }

    return suggestions
  }
}
```

---

## Progress Tracking & Streaming

### Event Bus Service

**File:** `lib/main/services/core/event-bus.service.ts`

```typescript
import { EventEmitter } from 'eventemitter3'
import { BrowserWindow } from 'electron'

export interface ProgressEvent {
  runId: string
  step: number
  totalSteps: number
  status: string
  message: string
  data?: any
}

export class EventBusService {
  private emitter = new EventEmitter()
  private mainWindow: BrowserWindow | null = null

  setMainWindow(window: BrowserWindow) {
    this.mainWindow = window
  }

  // Emit event to both internal listeners and renderer
  emit(event: string, data: any) {
    this.emitter.emit(event, data)

    // Forward to renderer if window exists
    if (this.mainWindow) {
      this.mainWindow.webContents.send('workflow:event', { event, data })
    }
  }

  on(event: string, handler: (...args: any[]) => void) {
    this.emitter.on(event, handler)
  }

  off(event: string, handler: (...args: any[]) => void) {
    this.emitter.off(event, handler)
  }

  // Progress tracking helpers
  emitProgress(progress: ProgressEvent) {
    this.emit('workflow:progress', progress)
  }

  emitStepStart(runId: string, step: number, totalSteps: number, stepName: string) {
    this.emitProgress({
      runId,
      step,
      totalSteps,
      status: 'running',
      message: `Starting: ${stepName}`,
    })
  }

  emitStepComplete(runId: string, step: number, totalSteps: number, stepName: string) {
    this.emitProgress({
      runId,
      step,
      totalSteps,
      status: 'completed',
      message: `Completed: ${stepName}`,
    })
  }

  emitStepError(runId: string, step: number, totalSteps: number, error: string) {
    this.emitProgress({
      runId,
      step,
      totalSteps,
      status: 'failed',
      message: error,
    })
  }
}
```

### Workflow Executor with Progress

**File:** `lib/main/services/workflow/workflow-executor.ts`

```typescript
import { VoltAgentService } from '../voltagent'
import { DatabaseService } from '../core/database.service'
import { EventBusService } from '../core/event-bus.service'
import { executeWithRetry, retryStrategies } from '@/lib/main/lib/errors/retry-strategies'

export class WorkflowExecutor {
  constructor(
    private voltAgent: VoltAgentService,
    private db: DatabaseService,
    private eventBus: EventBusService
  ) {}

  async execute(runId: string) {
    const run = await this.db.prisma.workflowRun.findUnique({
      where: { id: runId }
    })

    if (!run) throw new Error('Workflow run not found')

    try {
      // Update status
      await this.db.prisma.workflowRun.update({
        where: { id: runId },
        data: { status: 'running', startedAt: new Date() }
      })

      this.eventBus.emit('workflow:started', { runId })

      const startTime = Date.now()

      // Execute workflow with retry on rate limits
      const result = await executeWithRetry(
        () => this.voltAgent.executeWorkflow(
          run.workflowId as any,
          runId,
          run.input
        ),
        retryStrategies.rateLimitRetry
      )

      const executionTime = Date.now() - startTime

      // Success
      await this.db.prisma.workflowRun.update({
        where: { id: runId },
        data: {
          status: 'completed',
          output: result,
          executionTimeMs: executionTime,
          completedAt: new Date(),
        }
      })

      this.eventBus.emit('workflow:completed', { runId, result })

      return result

    } catch (error) {
      // Handle error
      await this.db.prisma.workflowRun.update({
        where: { id: runId },
        data: {
          status: 'failed',
          error: error.message,
        }
      })

      this.eventBus.emit('workflow:failed', { runId, error: error.message })

      throw error
    }
  }

  /**
   * Execute with step-by-step tracking
   */
  async executeWithSteps(runId: string) {
    const run = await this.db.prisma.workflowRun.findUnique({
      where: { id: runId },
      include: { workflow: true }
    })

    if (!run) throw new Error('Workflow run not found')

    const steps = (run.workflow.config as any).steps || []

    for (let i = 0; i < steps.length; i++) {
      const step = steps[i]

      // Create step record
      const stepRecord = await this.db.prisma.workflowStep.create({
        data: {
          workflowRunId: runId,
          stepIndex: i,
          stepName: step.name,
          stepType: step.type,
          status: 'running',
          startedAt: new Date(),
        }
      })

      this.eventBus.emitStepStart(runId, i, steps.length, step.name)

      try {
        // Execute step (implementation depends on step type)
        const stepResult = await this.executeStep(runId, step, i)

        await this.db.prisma.workflowStep.update({
          where: { id: stepRecord.id },
          data: {
            status: 'completed',
            output: stepResult,
            completedAt: new Date(),
          }
        })

        this.eventBus.emitStepComplete(runId, i, steps.length, step.name)

      } catch (error) {
        await this.db.prisma.workflowStep.update({
          where: { id: stepRecord.id },
          data: {
            status: 'failed',
            error: error.message,
          }
        })

        this.eventBus.emitStepError(runId, i, steps.length, error.message)

        // Check if we should pause for human intervention
        if (error.recoverable) {
          await this.pauseWorkflow(runId, 'error_recovery', { step: i, error: error.message })
          return { paused: true, reason: 'error_recovery' }
        }

        throw error
      }
    }

    return { completed: true }
  }

  private async executeStep(runId: string, step: any, stepIndex: number) {
    // Implementation based on step type
    // This would delegate to VoltAgent or custom handlers
  }

  private async pauseWorkflow(runId: string, reason: string, data: any) {
    await this.db.prisma.workflowRun.update({
      where: { id: runId },
      data: {
        status: 'paused',
        pausedAt: new Date(),
        pausedReason: reason,
        resumeData: data,
      }
    })

    this.eventBus.emit('workflow:paused', { runId, reason, data })
  }
}
```

---

## Human-in-the-Loop

### Human Review System

**File:** `lib/main/services/workflow/human-review.service.ts`

```typescript
import { DatabaseService } from '../core/database.service'
import { EventBusService } from '../core/event-bus.service'

export class HumanReviewService {
  constructor(
    private db: DatabaseService,
    private eventBus: EventBusService
  ) {}

  /**
   * Create a review request
   */
  async createReview(
    runId: string,
    reviewType: 'approval' | 'feedback' | 'correction',
    title: string,
    description: string,
    contextData: any
  ) {
    const review = await this.db.prisma.humanReview.create({
      data: {
        workflowRunId: runId,
        reviewType,
        title,
        description,
        status: 'pending',
        contextData,
      }
    })

    // Pause workflow
    await this.db.prisma.workflowRun.update({
      where: { id: runId },
      data: {
        status: 'paused',
        pausedAt: new Date(),
        pausedReason: `human_review:${reviewType}`,
      }
    })

    this.eventBus.emit('review:created', { reviewId: review.id, runId })

    return review
  }

  /**
   * Submit review decision
   */
  async submitReview(
    reviewId: string,
    decision: 'approved' | 'rejected' | 'needs_revision',
    notes?: string
  ) {
    const review = await this.db.prisma.humanReview.update({
      where: { id: reviewId },
      data: {
        status: decision === 'approved' ? 'approved' : 'rejected',
        decision,
        reviewerNotes: notes,
        submittedAt: new Date(),
      },
      include: { workflowRun: true }
    })

    if (decision === 'approved') {
      // Resume workflow
      await this.db.prisma.workflowRun.update({
        where: { id: review.workflowRunId },
        data: {
          status: 'pending',
          pausedAt: null,
          pausedReason: null,
        }
      })

      this.eventBus.emit('review:approved', { reviewId, runId: review.workflowRunId })
    } else {
      // Handle rejection
      this.eventBus.emit('review:rejected', {
        reviewId,
        runId: review.workflowRunId,
        notes
      })
    }

    return review
  }

  /**
   * Get pending reviews
   */
  async getPendingReviews(runId?: string) {
    return this.db.prisma.humanReview.findMany({
      where: {
        ...(runId && { workflowRunId: runId }),
        status: 'pending'
      },
      include: { workflowRun: true },
      orderBy: { createdAt: 'desc' }
    })
  }
}
```

### Integration with Workflow

```typescript
// In workflow definition
.andThen({
  execute: async ({ data, context }) => {
    // Request human review
    const reviewService = context.reviewService

    await reviewService.createReview(
      data.workflowRunId,
      'approval',
      'Review Generated Report',
      'Please review all generated sections and approve to continue to final compilation.',
      {
        sections: context.generatedSections,
        validationResults: context.validationResults,
      }
    )

    // This will pause the workflow
    return { pausedForReview: true }
  }
})
```

---

## File Management

### Enhanced File Service

**File:** `lib/main/services/core/file.service.ts`

```typescript
import { app } from 'electron'
import path from 'path'
import fs from 'fs/promises'
import crypto from 'crypto'
import { nanoid } from 'nanoid'
import mime from 'mime-types'
import { DatabaseService } from './database.service'
import { EventBusService } from './event-bus.service'

export class FileService {
  private storagePath: string

  constructor(
    private db: DatabaseService,
    private eventBus: EventBusService
  ) {
    this.storagePath = path.join(app.getPath('userData'), 'files')
  }

  async initialize() {
    await fs.mkdir(this.storagePath, { recursive: true })
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

    // Check for existing file with same hash
    const existing = await this.db.prisma.file.findFirst({
      where: { hash, workflowRunId }
    })

    if (existing) {
      // File already exists, return reference
      return existing
    }

    const fileId = nanoid()
    const ext = path.extname(originalName)
    const filename = `${fileId}${ext}`
    const localPath = path.join(this.storagePath, filename)

    // Write file
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
        category,
        localPath,
        hash,
      }
    })

    this.eventBus.emit('file:uploaded', { fileId, workflowRunId })

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
      const parent = await this.db.prisma.file.findUnique({
        where: { id: parentFileId }
      })
      version = (parent?.version || 0) + 1
    }

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
        version,
        parentFileId,
        localPath,
      }
    })

    this.eventBus.emit('file:generated', { fileId, workflowRunId, version })

    return file
  }

  /**
   * Read file with caching
   */
  async readFile(fileId: string): Promise<Buffer> {
    const file = await this.db.prisma.file.findUnique({
      where: { id: fileId }
    })

    if (!file) throw new Error('File not found')

    return fs.readFile(file.localPath)
  }

  /**
   * Get file versions
   */
  async getVersions(fileId: string) {
    const file = await this.db.prisma.file.findUnique({
      where: { id: fileId },
      include: { versions: { orderBy: { version: 'asc' } } }
    })

    return file?.versions || []
  }

  /**
   * Clean up old files (retention policy)
   */
  async cleanup(retentionDays: number = 30) {
    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - retentionDays)

    const oldFiles = await this.db.prisma.file.findMany({
      where: {
        createdAt: { lt: cutoffDate },
        workflowRun: {
          status: { in: ['completed', 'failed', 'cancelled'] }
        }
      }
    })

    for (const file of oldFiles) {
      try {
        await fs.unlink(file.localPath)
        await this.db.prisma.file.delete({ where: { id: file.id } })
      } catch (error) {
        console.error(`Failed to delete file ${file.id}:`, error)
      }
    }

    return oldFiles.length
  }
}
```

---

## Configuration Management

### System Configuration

**File:** `lib/main/services/core/config.service.ts`

```typescript
import { DatabaseService } from './database.service'

export class ConfigService {
  constructor(private db: DatabaseService) {}

  async get<T>(key: string, defaultValue?: T): Promise<T> {
    const config = await this.db.prisma.systemConfig.findUnique({
      where: { key }
    })

    if (!config) return defaultValue as T

    return config.value as T
  }

  async set(key: string, value: any) {
    await this.db.prisma.systemConfig.upsert({
      where: { key },
      create: { key, value },
      update: { value }
    })
  }

  async getAll() {
    const configs = await this.db.prisma.systemConfig.findMany()
    return Object.fromEntries(configs.map(c => [c.key, c.value]))
  }
}

// Default configuration
export const defaultConfig = {
  'agent.defaultModel': 'gpt-4o',
  'agent.temperature': 0.7,
  'agent.maxTokens': 4000,
  'workflow.maxConcurrentRuns': 3,
  'workflow.timeoutMinutes': 60,
  'file.maxUploadSize': 50 * 1024 * 1024, // 50MB
  'file.retentionDays': 30,
  'review.autoApproveAfterDays': 7,
}
```

---

## Testing Strategy

### Unit Tests

```typescript
// tests/unit/services/file.service.test.ts
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { FileService } from '@/lib/main/services/core/file.service'

describe('FileService', () => {
  let fileService: FileService
  let mockDb: any
  let mockEventBus: any

  beforeEach(() => {
    mockDb = {
      prisma: {
        file: {
          create: vi.fn(),
          findUnique: vi.fn(),
          findFirst: vi.fn(),
        }
      }
    }
    mockEventBus = {
      emit: vi.fn()
    }

    fileService = new FileService(mockDb, mockEventBus)
  })

  it('should save file with hash', async () => {
    const buffer = Buffer.from('test content')
    const file = await fileService.saveUpload(
      'run-123',
      buffer,
      'test.txt',
      'supporting_doc'
    )

    expect(mockDb.prisma.file.create).toHaveBeenCalled()
    expect(mockEventBus.emit).toHaveBeenCalledWith('file:uploaded', expect.any(Object))
  })

  it('should detect duplicate files', async () => {
    const buffer = Buffer.from('test content')

    mockDb.prisma.file.findFirst.mockResolvedValue({
      id: 'existing-file',
      hash: 'somehash'
    })

    const file = await fileService.saveUpload('run-123', buffer, 'test.txt')

    expect(file.id).toBe('existing-file')
    expect(mockDb.prisma.file.create).not.toHaveBeenCalled()
  })
})
```

### Integration Tests

```typescript
// tests/integration/workflow-execution.test.ts
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { initializeServices, serviceManager } from '@/lib/main/services/service-manager'
import { WorkflowExecutor } from '@/lib/main/services/workflow/workflow-executor'

describe('Workflow Execution', () => {
  beforeAll(async () => {
    await initializeServices()
  })

  afterAll(async () => {
    // Cleanup
  })

  it('should execute workflow end-to-end', async () => {
    const db = serviceManager.get('database')
    const executor = serviceManager.get('workflowExecutor')

    // Create run
    const run = await db.prisma.workflowRun.create({
      data: {
        workflowId: 'test-workflow',
        workflowVersion: '1.0.0',
        status: 'pending',
        totalSteps: 3,
        input: { test: 'data' }
      }
    })

    // Execute
    const result = await executor.execute(run.id)

    expect(result).toBeDefined()

    // Check status
    const updatedRun = await db.prisma.workflowRun.findUnique({
      where: { id: run.id }
    })

    expect(updatedRun?.status).toBe('completed')
  })
})
```

### E2E Tests

```typescript
// tests/e2e/discharge-permit.spec.ts
import { test, expect } from '@playwright/test'

test.describe('Discharge Permit Workflow', () => {
  test('should create and execute workflow', async ({ page }) => {
    // Navigate to app
    await page.goto('/')

    // Start new workflow
    await page.click('[data-testid="new-workflow"]')
    await page.selectOption('[data-testid="workflow-type"]', 'discharge-permit')

    // Upload files
    await page.setInputFiles('[data-testid="file-upload"]', [
      'tests/fixtures/project-info.pdf',
      'tests/fixtures/treatment-data.xlsx'
    ])

    // Fill project info
    await page.fill('[data-testid="project-name"]', 'Test Facility')
    await page.fill('[data-testid="location"]', '123 Main St')

    // Start workflow
    await page.click('[data-testid="start-workflow"]')

    // Wait for completion (or timeout)
    await expect(page.locator('[data-testid="workflow-status"]')).toHaveText('Completed', {
      timeout: 120000
    })

    // Check generated files
    const files = page.locator('[data-testid="generated-file"]')
    await expect(files).toHaveCount(6) // 5 sections + final report
  })

  test('should handle human review', async ({ page }) => {
    // ... similar setup

    // Enable review
    await page.check('[data-testid="enable-review"]')
    await page.click('[data-testid="start-workflow"]')

    // Wait for review request
    await expect(page.locator('[data-testid="review-prompt"]')).toBeVisible()

    // Approve
    await page.click('[data-testid="approve-button"]')

    // Wait for completion
    await expect(page.locator('[data-testid="workflow-status"]')).toHaveText('Completed')
  })
})
```

---

## Deployment

### Build Configuration

**File:** `electron-builder.yml`

```yaml
appId: com.company.workflow-tool
productName: Workflow Tool
directories:
  output: dist
  buildResources: build

files:
  - "!**/.vscode/*"
  - "!src/*"
  - "!tests/*"
  - "!.env*"
  - "!**/*.map"

extraResources:
  - from: "prisma/migrations"
    to: "prisma/migrations"
  - from: "node_modules/.prisma"
    to: "prisma"
  - from: "node_modules/@voltagent"
    to: "node_modules/@voltagent"

asarUnpack:
  - "node_modules/.prisma/**/*"
  - "node_modules/@prisma/**/*"
  - "node_modules/@voltagent/**/*"
  - "node_modules/@libsql/**/*"

mac:
  category: public.app-category.productivity
  hardenedRuntime: true
  gatekeeperAssess: false
  entitlements: build/entitlements.mac.plist
  entitlementsInherit: build/entitlements.mac.plist

win:
  target:
    - nsis
    - portable

linux:
  target:
    - AppImage
    - deb
  category: Utility
```

### Pre-build Script

**File:** `scripts/pre-build.ts`

```typescript
import { execSync } from 'child_process'
import fs from 'fs'
import path from 'path'

// Generate Prisma client
console.log('Generating Prisma client...')
execSync('npx prisma generate', { stdio: 'inherit' })

// Create VoltAgent memory directory structure
const memoryDir = path.join(__dirname, '../.voltagent')
if (!fs.existsSync(memoryDir)) {
  fs.mkdirSync(memoryDir, { recursive: true })
}

console.log('Pre-build completed')
```

### Bundling Strategy

```json
// package.json
{
  "scripts": {
    "prebuild": "tsx scripts/pre-build.ts",
    "build": "electron-vite build",
    "build:win": "npm run build && electron-builder --win",
    "build:mac": "npm run build && electron-builder --mac",
    "build:linux": "npm run build && electron-builder --linux"
  }
}
```

---

## Security

### Input Validation

**File:** `lib/main/lib/utils/validation.ts`

```typescript
import { z } from 'zod'

export const fileUploadSchema = z.object({
  filename: z.string().max(255),
  size: z.number().max(50 * 1024 * 1024), // 50MB
  mimeType: z.string().regex(/^[\w-]+\/[\w-]+$/),
})

export const workflowInputSchema = z.object({
  projectInfo: z.object({
    name: z.string().min(1).max(200),
    location: z.string().max(500).optional(),
    permitType: z.string().max(100).optional(),
  }),
  uploadedFileIds: z.array(z.string().uuid()).max(20),
})

export function sanitizeFilename(filename: string): string {
  return filename
    .replace(/[^a-zA-Z0-9.-]/g, '_')
    .replace(/\.{2,}/g, '.')
    .substring(0, 255)
}

export function validateFileType(mimeType: string, allowedTypes: string[]): boolean {
  return allowedTypes.some(type => {
    if (type.endsWith('/*')) {
      return mimeType.startsWith(type.slice(0, -2))
    }
    return mimeType === type
  })
}
```

### Tool Sandboxing

```typescript
// In tool execution
export const fileSaverTool = createTool({
  name: 'save_file',
  // ...
  execute: async ({ content, filename, category }, context) => {
    // Validate filename
    const sanitized = sanitizeFilename(filename)

    // Prevent path traversal
    if (sanitized.includes('..') || sanitized.includes('/') || sanitized.includes('\\')) {
      throw new Error('Invalid filename')
    }

    // Size limit
    if (Buffer.byteLength(content, 'utf-8') > 10 * 1024 * 1024) {
      throw new Error('Content too large (max 10MB)')
    }

    // Proceed with save
    return fileService.saveGenerated(/* ... */)
  },
})
```

### API Key Protection

- Encrypted storage using Electron `safeStorage`
- Never logged or exposed in errors
- Loaded only into process environment
- Cleared on app quit

---

## Summary

This comprehensive implementation plan provides:

✅ **Production-ready VoltAgent integration** with proper tools, agents, and workflows
✅ **Robust error handling** with custom errors, retry strategies, and recovery
✅ **Real-time progress tracking** via event bus and streaming updates
✅ **Human-in-the-loop** for review and approval workflows
✅ **Advanced file management** with versioning, deduplication, and retention
✅ **Comprehensive testing** strategy (unit, integration, E2E)
✅ **Security best practices** for input validation and API key management
✅ **Deployment configuration** for Electron packaging

**Ready to implement step-by-step!** 🚀
