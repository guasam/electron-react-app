# Implementation Plan: Enhanced Conveyor Architecture

## Table of Contents
1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Implementation Phases](#implementation-phases)
4. [File Structure](#file-structure)
5. [Detailed Implementation](#detailed-implementation)
6. [Usage Examples](#usage-examples)
7. [Testing Strategy](#testing-strategy)

---

## Overview

This document outlines the implementation plan for enhancing the Conveyor IPC system to support:
- **Event-based communication** for real-time updates
- **Service layer** for OpenAI, Postgres, Inngest, and VoltAgent
- **Type-safe** end-to-end communication with runtime validation
- **Streaming support** for LLM responses and long-running operations

### Goals
- ✅ Extend Conveyor without breaking existing functionality
- ✅ Support background queues (Inngest)
- ✅ Support LLM orchestration (VoltAgent)
- ✅ Enable streaming responses from LLMs
- ✅ Provide real-time progress updates
- ✅ Maintain type safety with Zod validation
- ✅ Follow existing project patterns

---

## Architecture

### Current Conveyor Flow (Request-Response)
```
React UI → useConveyor('api') → Preload → IPC → Handler → Service
                                                    ↓
React UI ← Promise resolves ←  Preload ← IPC ← Return value
```

### Enhanced Conveyor Flow (Request-Response + Events)
```
React UI → useConveyor('api') → Preload → IPC → Handler → Service
    ↑                                                         ↓
    |                                                    Event emitted
    |                                                         ↓
    └── useConveyorEvent() ← Preload ← webContents.send ← EventManager
```

### Three-Layer Architecture

```
┌─────────────────────────────────────────────────┐
│           React UI (Renderer Process)           │
│                                                  │
│  ├── useConveyor() - Request/response           │
│  └── useConveyorEvent() - Real-time updates     │
└─────────────────────────────────────────────────┘
                       ↕ IPC
┌─────────────────────────────────────────────────┐
│         Conveyor Layer (Type-Safe Bridge)       │
│                                                  │
│  ├── Schemas (Zod validation)                   │
│  ├── APIs (Client-side)                         │
│  ├── Handlers (Server-side)                     │
│  └── Event Manager (Event dispatcher)           │
└─────────────────────────────────────────────────┘
                       ↕
┌─────────────────────────────────────────────────┐
│       Services Layer (Business Logic)           │
│                                                  │
│  ├── OpenAI Service                             │
│  ├── Database Service (Postgres)                │
│  ├── Inngest Service (Background queues)        │
│  └── VoltAgent Service (LLM orchestration)      │
└─────────────────────────────────────────────────┘
```

---

## Implementation Phases

### Phase 1: Event System Foundation
**Goal:** Add event-based communication to Conveyor
- Event manager for main process
- Event schemas with Zod validation
- Preload API for event subscriptions
- React hooks for consuming events

### Phase 2: Configuration & Environment
**Goal:** Secure API key and database configuration
- Environment variable setup (.env)
- Configuration loader with validation
- Type-safe config access

### Phase 3: Service Layer
**Goal:** Implement core services
- OpenAI service (chat, streaming, embeddings)
- Database service (Postgres connection, queries)
- Inngest service (job queue management)
- VoltAgent service (LLM orchestration)

### Phase 4: Conveyor Integration
**Goal:** Wire services to Conveyor IPC
- Define schemas for each service
- Create API classes for renderer
- Implement handlers for main process
- Connect services to handlers

### Phase 5: Testing & Documentation
**Goal:** Ensure reliability and usability
- Example implementations
- Error handling patterns
- Testing utilities
- Usage documentation

---

## File Structure

```
/Users/mac/dev/apo/apo-internal/
│
├── .env                              # Environment variables (API keys, DB config)
├── implementation.md                 # This file
│
├── lib/
│   ├── conveyor/
│   │   ├── schemas/
│   │   │   ├── index.ts             # [MODIFY] Export all schemas
│   │   │   ├── events-schema.ts     # [NEW] Event type definitions
│   │   │   ├── ai-schema.ts         # [NEW] OpenAI operations
│   │   │   ├── db-schema.ts         # [NEW] Database operations
│   │   │   ├── inngest-schema.ts    # [NEW] Queue operations
│   │   │   └── voltagent-schema.ts  # [NEW] LLM orchestration
│   │   │
│   │   ├── api/
│   │   │   ├── index.ts             # [MODIFY] Export all APIs
│   │   │   ├── events-api.ts        # [NEW] Event subscription API
│   │   │   ├── ai-api.ts            # [NEW] OpenAI client API
│   │   │   ├── db-api.ts            # [NEW] Database client API
│   │   │   ├── inngest-api.ts       # [NEW] Queue client API
│   │   │   └── voltagent-api.ts     # [NEW] LLM orchestration client API
│   │   │
│   │   ├── handlers/
│   │   │   ├── ai-handler.ts        # [NEW] OpenAI IPC handlers
│   │   │   ├── db-handler.ts        # [NEW] Database IPC handlers
│   │   │   ├── inngest-handler.ts   # [NEW] Queue IPC handlers
│   │   │   └── voltagent-handler.ts # [NEW] LLM orchestration IPC handlers
│   │   │
│   │   └── events/
│   │       ├── event-manager.ts     # [NEW] Centralized event dispatcher
│   │       └── types.ts             # [NEW] Event system types
│   │
│   ├── main/
│   │   ├── app.ts                   # [MODIFY] Register new handlers
│   │   ├── config.ts                # [NEW] Configuration loader
│   │   │
│   │   └── services/
│   │       ├── types.ts             # [NEW] Shared service types
│   │       ├── openai-service.ts    # [NEW] OpenAI integration
│   │       ├── database-service.ts  # [NEW] Postgres integration
│   │       ├── inngest-service.ts   # [NEW] Queue management
│   │       └── voltagent-service.ts # [NEW] LLM orchestration
│   │
│   └── preload/
│       ├── preload.ts               # [MODIFY] Expose event API
│       └── shared.ts                # [MODIFY] Add event methods to ConveyorApi
│
└── app/
    ├── hooks/
    │   ├── useConveyorEvent.ts      # [NEW] React hook for events
    │   └── useStreamingResponse.ts  # [NEW] React hook for LLM streaming
    │
    └── types/
        └── conveyor.d.ts            # [MODIFY] Add event types to window
```

---

## Detailed Implementation

### Phase 1: Event System Foundation

#### 1.1 Event Manager

**File:** `lib/conveyor/events/event-manager.ts`

```typescript
import { BrowserWindow } from 'electron'
import { validateEvent, type EventName, type EventPayload } from '../schemas/events-schema'
import log from 'electron-log/main'

class ConveyorEventManager {
  private mainWindow: BrowserWindow | null = null

  /**
   * Set the main window for event broadcasting
   */
  setMainWindow(window: BrowserWindow): void {
    this.mainWindow = window
    log.info('Event manager: Main window registered')
  }

  /**
   * Emit a validated event to the renderer process
   */
  emit<T extends EventName>(event: T, payload: EventPayload<T>): void {
    if (!this.mainWindow || this.mainWindow.isDestroyed()) {
      log.warn(`Event manager: Cannot emit event "${event}" - window not available`)
      return
    }

    try {
      // Validate payload against schema
      const validatedPayload = validateEvent(event, payload)

      // Send to renderer
      this.mainWindow.webContents.send(`conveyor-event:${event}`, validatedPayload)

      log.debug(`Event emitted: ${event}`, validatedPayload)
    } catch (error) {
      log.error(`Event validation failed for "${event}":`, error)
      throw error
    }
  }

  /**
   * Check if event manager is ready to emit events
   */
  isReady(): boolean {
    return this.mainWindow !== null && !this.mainWindow.isDestroyed()
  }
}

// Export singleton instance
export const eventManager = new ConveyorEventManager()
```

**File:** `lib/conveyor/events/types.ts`

```typescript
/**
 * Base event payload structure
 */
export interface BaseEventPayload {
  timestamp?: number
}

/**
 * Event subscription handler
 */
export type EventHandler<T = any> = (payload: T) => void

/**
 * Event subscription cleanup function
 */
export type EventUnsubscribe = () => void
```

#### 1.2 Event Schemas

**File:** `lib/conveyor/schemas/events-schema.ts`

```typescript
import { z } from 'zod'

/**
 * Define all event schemas with Zod validation
 */
export const eventSchemas = {
  // OpenAI streaming events
  'ai:stream-start': z.object({
    requestId: z.string(),
    model: z.string(),
  }),
  'ai:stream-chunk': z.object({
    requestId: z.string(),
    chunk: z.string(),
    index: z.number(),
  }),
  'ai:stream-end': z.object({
    requestId: z.string(),
    totalTokens: z.number().optional(),
  }),
  'ai:stream-error': z.object({
    requestId: z.string(),
    error: z.string(),
  }),

  // Database events
  'db:query-progress': z.object({
    queryId: z.string(),
    progress: z.number().min(0).max(100),
    message: z.string().optional(),
  }),
  'db:connection-status': z.object({
    connected: z.boolean(),
    message: z.string().optional(),
  }),

  // Inngest events
  'inngest:job-started': z.object({
    jobId: z.string(),
    name: z.string(),
    timestamp: z.number(),
  }),
  'inngest:job-progress': z.object({
    jobId: z.string(),
    progress: z.number().min(0).max(100),
    status: z.enum(['pending', 'running', 'completed', 'failed']),
    message: z.string().optional(),
  }),
  'inngest:job-completed': z.object({
    jobId: z.string(),
    result: z.any().optional(),
    duration: z.number(),
  }),
  'inngest:job-failed': z.object({
    jobId: z.string(),
    error: z.string(),
  }),

  // VoltAgent events
  'voltagent:agent-started': z.object({
    agentId: z.string(),
    name: z.string(),
  }),
  'voltagent:agent-thinking': z.object({
    agentId: z.string(),
    thought: z.string(),
  }),
  'voltagent:agent-action': z.object({
    agentId: z.string(),
    action: z.string(),
    parameters: z.record(z.any()),
  }),
  'voltagent:agent-response': z.object({
    agentId: z.string(),
    response: z.string(),
    done: z.boolean(),
  }),
  'voltagent:agent-error': z.object({
    agentId: z.string(),
    error: z.string(),
  }),
} as const

/**
 * Extract event names as type-safe keys
 */
export type EventName = keyof typeof eventSchemas

/**
 * Extract payload type for a specific event
 */
export type EventPayload<T extends EventName> = z.infer<typeof eventSchemas[T]>

/**
 * Validate event payload
 */
export function validateEvent<T extends EventName>(
  eventName: T,
  payload: unknown
): EventPayload<T> {
  const schema = eventSchemas[eventName]
  return schema.parse(payload)
}
```

#### 1.3 Preload API Enhancement

**File:** `lib/preload/shared.ts` (MODIFY)

```typescript
import type { ElectronAPI, IpcRenderer } from '@electron-toolkit/preload'
import type { ChannelName, ChannelArgs, ChannelReturn } from '@/lib/conveyor/schemas'
import type { EventName, EventPayload } from '@/lib/conveyor/schemas/events-schema'
import type { EventHandler, EventUnsubscribe } from '@/lib/conveyor/events/types'

export abstract class ConveyorApi {
  protected renderer: IpcRenderer

  constructor(electronApi: ElectronAPI) {
    this.renderer = electronApi.ipcRenderer
  }

  /**
   * Invoke IPC method (request-response pattern)
   */
  invoke = async <T extends ChannelName>(
    channel: T,
    ...args: ChannelArgs<T>
  ): Promise<ChannelReturn<T>> => {
    return this.renderer.invoke(channel, ...args) as Promise<ChannelReturn<T>>
  }

  /**
   * Subscribe to events (publish-subscribe pattern)
   */
  on = <T extends EventName>(
    eventName: T,
    handler: EventHandler<EventPayload<T>>
  ): EventUnsubscribe => {
    const channel = `conveyor-event:${eventName}`
    const listener = (_: any, payload: EventPayload<T>) => handler(payload)

    this.renderer.on(channel, listener)

    // Return unsubscribe function
    return () => {
      this.renderer.removeListener(channel, listener)
    }
  }

  /**
   * Subscribe to events (one-time listener)
   */
  once = <T extends EventName>(
    eventName: T,
    handler: EventHandler<EventPayload<T>>
  ): void => {
    const channel = `conveyor-event:${eventName}`
    const listener = (_: any, payload: EventPayload<T>) => handler(payload)

    this.renderer.once(channel, listener)
  }

  /**
   * Remove event listener
   */
  off = <T extends EventName>(
    eventName: T,
    handler: EventHandler<EventPayload<T>>
  ): void => {
    const channel = `conveyor-event:${eventName}`
    this.renderer.removeListener(channel, handler as any)
  }
}
```

#### 1.4 React Hooks

**File:** `app/hooks/useConveyorEvent.ts`

```typescript
import { useEffect, useRef } from 'react'
import type { EventName, EventPayload } from '@/lib/conveyor/schemas/events-schema'
import type { EventHandler } from '@/lib/conveyor/events/types'

/**
 * React hook to subscribe to Conveyor events
 *
 * @example
 * ```typescript
 * useConveyorEvent('ai:stream-chunk', (chunk) => {
 *   console.log('Received chunk:', chunk.chunk)
 * })
 * ```
 */
export function useConveyorEvent<T extends EventName>(
  eventName: T,
  handler: EventHandler<EventPayload<T>>,
  deps: React.DependencyList = []
) {
  // Use ref to store latest handler without re-subscribing
  const handlerRef = useRef(handler)

  useEffect(() => {
    handlerRef.current = handler
  }, [handler])

  useEffect(() => {
    const wrappedHandler = (payload: EventPayload<T>) => {
      handlerRef.current(payload)
    }

    // Subscribe
    const unsubscribe = window.conveyor.app.on(eventName, wrappedHandler)

    // Cleanup on unmount or deps change
    return () => {
      unsubscribe()
    }
  }, [eventName, ...deps])
}
```

**File:** `app/hooks/useStreamingResponse.ts`

```typescript
import { useState, useCallback } from 'react'
import { useConveyorEvent } from './useConveyorEvent'

interface StreamingState {
  content: string
  isStreaming: boolean
  error: string | null
}

/**
 * React hook for handling streaming LLM responses
 *
 * @example
 * ```typescript
 * const { content, isStreaming, error } = useStreamingResponse(requestId)
 * ```
 */
export function useStreamingResponse(requestId: string | null) {
  const [state, setState] = useState<StreamingState>({
    content: '',
    isStreaming: false,
    error: null,
  })

  const reset = useCallback(() => {
    setState({ content: '', isStreaming: false, error: null })
  }, [])

  // Handle stream start
  useConveyorEvent(
    'ai:stream-start',
    (payload) => {
      if (payload.requestId === requestId) {
        setState({ content: '', isStreaming: true, error: null })
      }
    },
    [requestId]
  )

  // Handle stream chunks
  useConveyorEvent(
    'ai:stream-chunk',
    (payload) => {
      if (payload.requestId === requestId) {
        setState((prev) => ({
          ...prev,
          content: prev.content + payload.chunk,
        }))
      }
    },
    [requestId]
  )

  // Handle stream end
  useConveyorEvent(
    'ai:stream-end',
    (payload) => {
      if (payload.requestId === requestId) {
        setState((prev) => ({ ...prev, isStreaming: false }))
      }
    },
    [requestId]
  )

  // Handle stream errors
  useConveyorEvent(
    'ai:stream-error',
    (payload) => {
      if (payload.requestId === requestId) {
        setState((prev) => ({
          ...prev,
          isStreaming: false,
          error: payload.error,
        }))
      }
    },
    [requestId]
  )

  return {
    ...state,
    reset,
  }
}
```

**File:** `app/types/conveyor.d.ts` (ADD/MODIFY)

```typescript
import type { conveyor } from '@/lib/conveyor/api'

declare global {
  interface Window {
    conveyor: typeof conveyor
  }
}

export {}
```

---

### Phase 2: Configuration & Environment

#### 2.1 Environment Setup

**File:** `.env` (CREATE - Add to .gitignore!)

```env
# OpenAI Configuration
OPENAI_API_KEY=sk-your-openai-api-key-here
OPENAI_ORG_ID=org-your-org-id-here  # Optional

# Database Configuration (Neon Postgres)
DATABASE_URL=postgresql://user:password@host.neon.tech/dbname?sslmode=require

# Inngest Configuration
INNGEST_EVENT_KEY=your-inngest-event-key
INNGEST_SIGNING_KEY=your-inngest-signing-key

# VoltAgent Configuration
VOLTAGENT_API_KEY=your-voltagent-api-key  # If applicable

# Application Configuration
NODE_ENV=development
LOG_LEVEL=debug
```

**File:** `.env.example` (CREATE - Commit this one)

```env
# OpenAI Configuration
OPENAI_API_KEY=
OPENAI_ORG_ID=

# Database Configuration (Neon Postgres)
DATABASE_URL=

# Inngest Configuration
INNGEST_EVENT_KEY=
INNGEST_SIGNING_KEY=

# VoltAgent Configuration
VOLTAGENT_API_KEY=

# Application Configuration
NODE_ENV=development
LOG_LEVEL=debug
```

#### 2.2 Configuration Loader

**File:** `lib/main/config.ts`

```typescript
import { z } from 'zod'
import log from 'electron-log/main'

/**
 * Configuration schema with validation
 */
const configSchema = z.object({
  openai: z.object({
    apiKey: z.string().min(1, 'OpenAI API key is required'),
    orgId: z.string().optional(),
  }),
  database: z.object({
    url: z.string().url('Invalid database URL'),
  }),
  inngest: z.object({
    eventKey: z.string().min(1, 'Inngest event key is required'),
    signingKey: z.string().min(1, 'Inngest signing key is required'),
  }),
  voltagent: z.object({
    apiKey: z.string().optional(),
  }),
  app: z.object({
    nodeEnv: z.enum(['development', 'production', 'test']).default('development'),
    logLevel: z.enum(['error', 'warn', 'info', 'debug']).default('info'),
  }),
})

export type AppConfig = z.infer<typeof configSchema>

/**
 * Load and validate configuration from environment variables
 */
export function loadConfig(): AppConfig {
  try {
    const config = {
      openai: {
        apiKey: process.env.OPENAI_API_KEY || '',
        orgId: process.env.OPENAI_ORG_ID,
      },
      database: {
        url: process.env.DATABASE_URL || '',
      },
      inngest: {
        eventKey: process.env.INNGEST_EVENT_KEY || '',
        signingKey: process.env.INNGEST_SIGNING_KEY || '',
      },
      voltagent: {
        apiKey: process.env.VOLTAGENT_API_KEY,
      },
      app: {
        nodeEnv: (process.env.NODE_ENV as any) || 'development',
        logLevel: (process.env.LOG_LEVEL as any) || 'info',
      },
    }

    const validated = configSchema.parse(config)

    log.info('Configuration loaded successfully')

    return validated
  } catch (error) {
    log.error('Configuration validation failed:', error)
    throw new Error('Failed to load configuration. Check your .env file.')
  }
}

// Export singleton config instance
let configInstance: AppConfig | null = null

export function getConfig(): AppConfig {
  if (!configInstance) {
    configInstance = loadConfig()
  }
  return configInstance
}
```

---

### Phase 3: Service Layer

#### 3.1 Shared Service Types

**File:** `lib/main/services/types.ts`

```typescript
/**
 * Shared types for services
 */

export interface ServiceConfig {
  apiKey?: string
  baseUrl?: string
  timeout?: number
}

export interface StreamOptions {
  onStart?: () => void
  onChunk?: (chunk: string) => void
  onEnd?: (metadata?: any) => void
  onError?: (error: Error) => void
}

export interface DatabaseQueryResult<T = any> {
  rows: T[]
  rowCount: number
  fields: Array<{ name: string; dataTypeID: number }>
}

export interface JobMetadata {
  id: string
  name: string
  status: 'pending' | 'running' | 'completed' | 'failed'
  createdAt: number
  updatedAt: number
  progress?: number
  error?: string
}
```

#### 3.2 OpenAI Service

**File:** `lib/main/services/openai-service.ts`

```typescript
import OpenAI from 'openai'
import { getConfig } from '../config'
import { eventManager } from '@/lib/conveyor/events/event-manager'
import log from 'electron-log/main'
import { randomUUID } from 'crypto'

export class OpenAIService {
  private client: OpenAI
  private config: ReturnType<typeof getConfig>

  constructor() {
    this.config = getConfig()

    this.client = new OpenAI({
      apiKey: this.config.openai.apiKey,
      organization: this.config.openai.orgId,
    })

    log.info('OpenAI service initialized')
  }

  /**
   * Simple chat completion (non-streaming)
   */
  async chat(prompt: string, model: string = 'gpt-4'): Promise<string> {
    try {
      log.debug('OpenAI chat request:', { model, promptLength: prompt.length })

      const response = await this.client.chat.completions.create({
        model,
        messages: [{ role: 'user', content: prompt }],
      })

      const content = response.choices[0]?.message?.content || ''

      log.debug('OpenAI chat response:', { contentLength: content.length })

      return content
    } catch (error) {
      log.error('OpenAI chat error:', error)
      throw error
    }
  }

  /**
   * Streaming chat completion with event emissions
   */
  async chatStream(
    prompt: string,
    model: string = 'gpt-4'
  ): Promise<{ requestId: string }> {
    const requestId = randomUUID()

    try {
      log.debug('OpenAI stream request:', { requestId, model })

      // Emit start event
      eventManager.emit('ai:stream-start', { requestId, model })

      // Create streaming request
      const stream = await this.client.chat.completions.create({
        model,
        messages: [{ role: 'user', content: prompt }],
        stream: true,
      })

      // Process stream in background
      this.processStream(stream, requestId)

      return { requestId }
    } catch (error) {
      log.error('OpenAI stream error:', error)
      eventManager.emit('ai:stream-error', {
        requestId,
        error: error instanceof Error ? error.message : 'Unknown error',
      })
      throw error
    }
  }

  /**
   * Process streaming response
   */
  private async processStream(
    stream: AsyncIterable<OpenAI.Chat.Completions.ChatCompletionChunk>,
    requestId: string
  ) {
    try {
      let index = 0

      for await (const chunk of stream) {
        const content = chunk.choices[0]?.delta?.content || ''

        if (content) {
          eventManager.emit('ai:stream-chunk', {
            requestId,
            chunk: content,
            index: index++,
          })
        }
      }

      // Emit completion event
      eventManager.emit('ai:stream-end', {
        requestId,
      })

      log.debug('OpenAI stream completed:', { requestId, chunks: index })
    } catch (error) {
      log.error('Stream processing error:', error)
      eventManager.emit('ai:stream-error', {
        requestId,
        error: error instanceof Error ? error.message : 'Stream processing failed',
      })
    }
  }

  /**
   * Generate embeddings
   */
  async createEmbedding(text: string, model: string = 'text-embedding-3-small'): Promise<number[]> {
    try {
      const response = await this.client.embeddings.create({
        model,
        input: text,
      })

      return response.data[0].embedding
    } catch (error) {
      log.error('OpenAI embedding error:', error)
      throw error
    }
  }
}

// Export singleton instance
let serviceInstance: OpenAIService | null = null

export function getOpenAIService(): OpenAIService {
  if (!serviceInstance) {
    serviceInstance = new OpenAIService()
  }
  return serviceInstance
}
```

#### 3.3 Database Service

**File:** `lib/main/services/database-service.ts`

```typescript
import { Pool, PoolClient, QueryResult } from 'pg'
import { getConfig } from '../config'
import { eventManager } from '@/lib/conveyor/events/event-manager'
import log from 'electron-log/main'
import type { DatabaseQueryResult } from './types'

export class DatabaseService {
  private pool: Pool
  private config: ReturnType<typeof getConfig>

  constructor() {
    this.config = getConfig()

    this.pool = new Pool({
      connectionString: this.config.database.url,
      ssl: {
        rejectUnauthorized: false, // For Neon
      },
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    })

    // Setup event listeners
    this.setupEventListeners()

    log.info('Database service initialized')
  }

  private setupEventListeners() {
    this.pool.on('connect', () => {
      log.debug('Database: New client connected')
      eventManager.emit('db:connection-status', {
        connected: true,
        message: 'Connected to database',
      })
    })

    this.pool.on('error', (err) => {
      log.error('Database pool error:', err)
      eventManager.emit('db:connection-status', {
        connected: false,
        message: err.message,
      })
    })
  }

  /**
   * Execute a query
   */
  async query<T = any>(
    sql: string,
    params: any[] = []
  ): Promise<DatabaseQueryResult<T>> {
    try {
      log.debug('Database query:', { sql, params })

      const result: QueryResult = await this.pool.query(sql, params)

      log.debug('Database query result:', { rowCount: result.rowCount })

      return {
        rows: result.rows,
        rowCount: result.rowCount,
        fields: result.fields,
      }
    } catch (error) {
      log.error('Database query error:', error)
      throw error
    }
  }

  /**
   * Execute a transaction
   */
  async transaction<T>(
    callback: (client: PoolClient) => Promise<T>
  ): Promise<T> {
    const client = await this.pool.connect()

    try {
      await client.query('BEGIN')
      const result = await callback(client)
      await client.query('COMMIT')
      return result
    } catch (error) {
      await client.query('ROLLBACK')
      log.error('Transaction error:', error)
      throw error
    } finally {
      client.release()
    }
  }

  /**
   * Test database connection
   */
  async testConnection(): Promise<boolean> {
    try {
      const result = await this.query('SELECT NOW()')
      log.info('Database connection test successful:', result.rows[0])
      return true
    } catch (error) {
      log.error('Database connection test failed:', error)
      return false
    }
  }

  /**
   * Close all connections
   */
  async close(): Promise<void> {
    await this.pool.end()
    log.info('Database connections closed')
  }
}

// Export singleton instance
let serviceInstance: DatabaseService | null = null

export function getDatabaseService(): DatabaseService {
  if (!serviceInstance) {
    serviceInstance = new DatabaseService()
  }
  return serviceInstance
}
```

#### 3.4 Inngest Service

**File:** `lib/main/services/inngest-service.ts`

```typescript
import { Inngest } from 'inngest'
import { getConfig } from '../config'
import { eventManager } from '@/lib/conveyor/events/event-manager'
import log from 'electron-log/main'
import { randomUUID } from 'crypto'
import type { JobMetadata } from './types'

export class InngestService {
  private client: Inngest
  private config: ReturnType<typeof getConfig>
  private jobs: Map<string, JobMetadata> = new Map()

  constructor() {
    this.config = getConfig()

    this.client = new Inngest({
      id: 'electron-app',
      eventKey: this.config.inngest.eventKey,
    })

    log.info('Inngest service initialized')
  }

  /**
   * Send a job to the queue
   */
  async sendJob(name: string, data: Record<string, any>): Promise<{ jobId: string }> {
    const jobId = randomUUID()

    try {
      log.debug('Sending Inngest job:', { jobId, name })

      // Create job metadata
      const metadata: JobMetadata = {
        id: jobId,
        name,
        status: 'pending',
        createdAt: Date.now(),
        updatedAt: Date.now(),
        progress: 0,
      }

      this.jobs.set(jobId, metadata)

      // Send to Inngest
      await this.client.send({
        name,
        data: {
          ...data,
          jobId,
        },
      })

      // Emit started event
      eventManager.emit('inngest:job-started', {
        jobId,
        name,
        timestamp: Date.now(),
      })

      return { jobId }
    } catch (error) {
      log.error('Failed to send Inngest job:', error)
      throw error
    }
  }

  /**
   * Update job progress (called by Inngest functions)
   */
  updateJobProgress(
    jobId: string,
    progress: number,
    status: JobMetadata['status'],
    message?: string
  ): void {
    const job = this.jobs.get(jobId)

    if (job) {
      job.progress = progress
      job.status = status
      job.updatedAt = Date.now()

      this.jobs.set(jobId, job)

      eventManager.emit('inngest:job-progress', {
        jobId,
        progress,
        status,
        message,
      })

      log.debug('Job progress updated:', { jobId, progress, status })
    }
  }

  /**
   * Mark job as completed
   */
  completeJob(jobId: string, result?: any): void {
    const job = this.jobs.get(jobId)

    if (job) {
      const duration = Date.now() - job.createdAt

      job.status = 'completed'
      job.updatedAt = Date.now()

      this.jobs.set(jobId, job)

      eventManager.emit('inngest:job-completed', {
        jobId,
        result,
        duration,
      })

      log.info('Job completed:', { jobId, duration })
    }
  }

  /**
   * Mark job as failed
   */
  failJob(jobId: string, error: string): void {
    const job = this.jobs.get(jobId)

    if (job) {
      job.status = 'failed'
      job.error = error
      job.updatedAt = Date.now()

      this.jobs.set(jobId, job)

      eventManager.emit('inngest:job-failed', {
        jobId,
        error,
      })

      log.error('Job failed:', { jobId, error })
    }
  }

  /**
   * Get job status
   */
  getJobStatus(jobId: string): JobMetadata | undefined {
    return this.jobs.get(jobId)
  }

  /**
   * Get all jobs
   */
  getAllJobs(): JobMetadata[] {
    return Array.from(this.jobs.values())
  }
}

// Export singleton instance
let serviceInstance: InngestService | null = null

export function getInngestService(): InngestService {
  if (!serviceInstance) {
    serviceInstance = new InngestService()
  }
  return serviceInstance
}
```

#### 3.5 VoltAgent Service (Placeholder)

**File:** `lib/main/services/voltagent-service.ts`

```typescript
import { getConfig } from '../config'
import { eventManager } from '@/lib/conveyor/events/event-manager'
import log from 'electron-log/main'
import { randomUUID } from 'crypto'

/**
 * VoltAgent service for LLM orchestration
 *
 * Note: Replace this placeholder with actual VoltAgent SDK integration
 * when available. This example shows the expected interface.
 */
export class VoltAgentService {
  private config: ReturnType<typeof getConfig>

  constructor() {
    this.config = getConfig()
    log.info('VoltAgent service initialized')
  }

  /**
   * Run an agent with the given prompt
   */
  async runAgent(
    prompt: string,
    agentName: string = 'default'
  ): Promise<{ agentId: string }> {
    const agentId = randomUUID()

    try {
      log.debug('Starting VoltAgent:', { agentId, agentName })

      // Emit started event
      eventManager.emit('voltagent:agent-started', {
        agentId,
        name: agentName,
      })

      // TODO: Replace with actual VoltAgent SDK call
      // Example: await voltAgentClient.run({ prompt, agentName })

      // For now, simulate agent execution
      this.simulateAgentExecution(agentId, prompt)

      return { agentId }
    } catch (error) {
      log.error('VoltAgent error:', error)
      eventManager.emit('voltagent:agent-error', {
        agentId,
        error: error instanceof Error ? error.message : 'Unknown error',
      })
      throw error
    }
  }

  /**
   * Simulate agent execution (replace with real implementation)
   */
  private async simulateAgentExecution(agentId: string, prompt: string) {
    // Simulate thinking
    setTimeout(() => {
      eventManager.emit('voltagent:agent-thinking', {
        agentId,
        thought: 'Analyzing the prompt...',
      })
    }, 500)

    // Simulate action
    setTimeout(() => {
      eventManager.emit('voltagent:agent-action', {
        agentId,
        action: 'search',
        parameters: { query: prompt },
      })
    }, 1500)

    // Simulate response
    setTimeout(() => {
      eventManager.emit('voltagent:agent-response', {
        agentId,
        response: 'This is a simulated response. Replace with actual VoltAgent integration.',
        done: true,
      })
    }, 3000)
  }
}

// Export singleton instance
let serviceInstance: VoltAgentService | null = null

export function getVoltAgentService(): VoltAgentService {
  if (!serviceInstance) {
    serviceInstance = new VoltAgentService()
  }
  return serviceInstance
}
```

---

### Phase 4: Conveyor Integration

#### 4.1 OpenAI Integration

**File:** `lib/conveyor/schemas/ai-schema.ts`

```typescript
import { z } from 'zod'

export const aiIpcSchema = {
  // Simple chat
  'ai-chat': {
    args: z.tuple([
      z.string(), // prompt
      z.string().optional(), // model
    ]),
    return: z.string(),
  },

  // Streaming chat
  'ai-chat-stream': {
    args: z.tuple([
      z.string(), // prompt
      z.string().optional(), // model
    ]),
    return: z.object({ requestId: z.string() }),
  },

  // Create embedding
  'ai-create-embedding': {
    args: z.tuple([
      z.string(), // text
      z.string().optional(), // model
    ]),
    return: z.array(z.number()),
  },
} as const
```

**File:** `lib/conveyor/api/ai-api.ts`

```typescript
import { ConveyorApi } from '@/lib/preload/shared'

export class AiApi extends ConveyorApi {
  /**
   * Simple chat completion
   */
  chat = (prompt: string, model?: string) => {
    return this.invoke('ai-chat', prompt, model)
  }

  /**
   * Streaming chat completion
   */
  chatStream = (prompt: string, model?: string) => {
    return this.invoke('ai-chat-stream', prompt, model)
  }

  /**
   * Create text embedding
   */
  createEmbedding = (text: string, model?: string) => {
    return this.invoke('ai-create-embedding', text, model)
  }
}
```

**File:** `lib/conveyor/handlers/ai-handler.ts`

```typescript
import { handle } from '@/lib/main/shared'
import { getOpenAIService } from '@/lib/main/services/openai-service'

export function registerAiHandlers() {
  const openai = getOpenAIService()

  handle('ai-chat', async (prompt: string, model?: string) => {
    return await openai.chat(prompt, model)
  })

  handle('ai-chat-stream', async (prompt: string, model?: string) => {
    return await openai.chatStream(prompt, model)
  })

  handle('ai-create-embedding', async (text: string, model?: string) => {
    return await openai.createEmbedding(text, model)
  })
}
```

#### 4.2 Database Integration

**File:** `lib/conveyor/schemas/db-schema.ts`

```typescript
import { z } from 'zod'

export const dbIpcSchema = {
  // Execute query
  'db-query': {
    args: z.tuple([
      z.string(), // sql
      z.array(z.any()).optional(), // params
    ]),
    return: z.object({
      rows: z.array(z.any()),
      rowCount: z.number(),
      fields: z.array(z.object({
        name: z.string(),
        dataTypeID: z.number(),
      })),
    }),
  },

  // Test connection
  'db-test-connection': {
    args: z.tuple([]),
    return: z.boolean(),
  },
} as const
```

**File:** `lib/conveyor/api/db-api.ts`

```typescript
import { ConveyorApi } from '@/lib/preload/shared'

export class DbApi extends ConveyorApi {
  /**
   * Execute SQL query
   */
  query = <T = any>(sql: string, params?: any[]) => {
    return this.invoke('db-query', sql, params) as Promise<{
      rows: T[]
      rowCount: number
      fields: Array<{ name: string; dataTypeID: number }>
    }>
  }

  /**
   * Test database connection
   */
  testConnection = () => {
    return this.invoke('db-test-connection')
  }
}
```

**File:** `lib/conveyor/handlers/db-handler.ts`

```typescript
import { handle } from '@/lib/main/shared'
import { getDatabaseService } from '@/lib/main/services/database-service'

export function registerDbHandlers() {
  const db = getDatabaseService()

  handle('db-query', async (sql: string, params?: any[]) => {
    return await db.query(sql, params)
  })

  handle('db-test-connection', async () => {
    return await db.testConnection()
  })
}
```

#### 4.3 Inngest Integration

**File:** `lib/conveyor/schemas/inngest-schema.ts`

```typescript
import { z } from 'zod'

export const inngestIpcSchema = {
  // Send job
  'inngest-send-job': {
    args: z.tuple([
      z.string(), // name
      z.record(z.any()), // data
    ]),
    return: z.object({ jobId: z.string() }),
  },

  // Get job status
  'inngest-get-job-status': {
    args: z.tuple([z.string()]), // jobId
    return: z.object({
      id: z.string(),
      name: z.string(),
      status: z.enum(['pending', 'running', 'completed', 'failed']),
      createdAt: z.number(),
      updatedAt: z.number(),
      progress: z.number().optional(),
      error: z.string().optional(),
    }).optional(),
  },

  // Get all jobs
  'inngest-get-all-jobs': {
    args: z.tuple([]),
    return: z.array(z.object({
      id: z.string(),
      name: z.string(),
      status: z.enum(['pending', 'running', 'completed', 'failed']),
      createdAt: z.number(),
      updatedAt: z.number(),
      progress: z.number().optional(),
      error: z.string().optional(),
    })),
  },
} as const
```

**File:** `lib/conveyor/api/inngest-api.ts`

```typescript
import { ConveyorApi } from '@/lib/preload/shared'

export class InngestApi extends ConveyorApi {
  /**
   * Send a job to the queue
   */
  sendJob = (name: string, data: Record<string, any>) => {
    return this.invoke('inngest-send-job', name, data)
  }

  /**
   * Get job status
   */
  getJobStatus = (jobId: string) => {
    return this.invoke('inngest-get-job-status', jobId)
  }

  /**
   * Get all jobs
   */
  getAllJobs = () => {
    return this.invoke('inngest-get-all-jobs')
  }
}
```

**File:** `lib/conveyor/handlers/inngest-handler.ts`

```typescript
import { handle } from '@/lib/main/shared'
import { getInngestService } from '@/lib/main/services/inngest-service'

export function registerInngestHandlers() {
  const inngest = getInngestService()

  handle('inngest-send-job', async (name: string, data: Record<string, any>) => {
    return await inngest.sendJob(name, data)
  })

  handle('inngest-get-job-status', async (jobId: string) => {
    return inngest.getJobStatus(jobId)
  })

  handle('inngest-get-all-jobs', async () => {
    return inngest.getAllJobs()
  })
}
```

#### 4.4 VoltAgent Integration

**File:** `lib/conveyor/schemas/voltagent-schema.ts`

```typescript
import { z } from 'zod'

export const voltagentIpcSchema = {
  'voltagent-run-agent': {
    args: z.tuple([
      z.string(), // prompt
      z.string().optional(), // agentName
    ]),
    return: z.object({ agentId: z.string() }),
  },
} as const
```

**File:** `lib/conveyor/api/voltagent-api.ts`

```typescript
import { ConveyorApi } from '@/lib/preload/shared'

export class VoltagentApi extends ConveyorApi {
  /**
   * Run an agent
   */
  runAgent = (prompt: string, agentName?: string) => {
    return this.invoke('voltagent-run-agent', prompt, agentName)
  }
}
```

**File:** `lib/conveyor/handlers/voltagent-handler.ts`

```typescript
import { handle } from '@/lib/main/shared'
import { getVoltAgentService } from '@/lib/main/services/voltagent-service'

export function registerVoltagentHandlers() {
  const voltagent = getVoltAgentService()

  handle('voltagent-run-agent', async (prompt: string, agentName?: string) => {
    return await voltagent.runAgent(prompt, agentName)
  })
}
```

#### 4.5 Wire Everything Together

**File:** `lib/conveyor/schemas/index.ts` (MODIFY)

```typescript
import { windowIpcSchema } from './window-schema'
import { appIpcSchema } from './app-schema'
import { updaterIpcSchema } from './updater-schema'
import { aiIpcSchema } from './ai-schema'
import { dbIpcSchema } from './db-schema'
import { inngestIpcSchema } from './inngest-schema'
import { voltagentIpcSchema } from './voltagent-schema'

// ... existing validation code ...

export const ipcSchemas = {
  ...windowIpcSchema,
  ...appIpcSchema,
  ...updaterIpcSchema,
  ...aiIpcSchema,
  ...dbIpcSchema,
  ...inngestIpcSchema,
  ...voltagentIpcSchema,
} as const

// ... rest of the file ...

// Export event schemas
export * from './events-schema'
```

**File:** `lib/conveyor/api/index.ts` (MODIFY)

```typescript
import { electronAPI } from '@electron-toolkit/preload'
import { AppApi } from './app-api'
import { WindowApi } from './window-api'
import { UpdaterApi } from './updater-api'
import { AiApi } from './ai-api'
import { DbApi } from './db-api'
import { InngestApi } from './inngest-api'
import { VoltagentApi } from './voltagent-api'

export const conveyor = {
  app: new AppApi(electronAPI),
  window: new WindowApi(electronAPI),
  updater: new UpdaterApi(electronAPI),
  ai: new AiApi(electronAPI),
  db: new DbApi(electronAPI),
  inngest: new InngestApi(electronAPI),
  voltagent: new VoltagentApi(electronAPI),
}
```

**File:** `lib/main/app.ts` (MODIFY)

```typescript
import { BrowserWindow, shell, app } from 'electron'
import { join } from 'path'
import appIcon from '@/resources/build/icon.png?asset'
import { registerResourcesProtocol } from './protocols'
import { registerWindowHandlers } from '@/lib/conveyor/handlers/window-handler'
import { registerAppHandlers } from '@/lib/conveyor/handlers/app-handler'
import { registerUpdaterHandlers } from '@/lib/conveyor/handlers/updater-handler'
import { registerAiHandlers } from '@/lib/conveyor/handlers/ai-handler'
import { registerDbHandlers } from '@/lib/conveyor/handlers/db-handler'
import { registerInngestHandlers } from '@/lib/conveyor/handlers/inngest-handler'
import { registerVoltagentHandlers } from '@/lib/conveyor/handlers/voltagent-handler'
import { updateManager } from './updater'
import { eventManager } from '@/lib/conveyor/events/event-manager'

export function createAppWindow(): void {
  // Register custom protocol for resources
  registerResourcesProtocol()

  // Create the main window.
  const mainWindow = new BrowserWindow({
    width: 900,
    height: 670,
    show: false,
    backgroundColor: '#1c1c1c',
    icon: appIcon,
    frame: false,
    titleBarStyle: 'hiddenInset',
    title: 'Electron React App',
    maximizable: false,
    resizable: false,
    webPreferences: {
      preload: join(__dirname, '../preload/preload.js'),
      sandbox: false,
    },
  })

  // Register IPC events for the main window.
  registerWindowHandlers(mainWindow)
  registerAppHandlers(app)
  registerUpdaterHandlers()

  // Register new service handlers
  registerAiHandlers()
  registerDbHandlers()
  registerInngestHandlers()
  registerVoltagentHandlers()

  // Set the main window for services
  updateManager.setMainWindow(mainWindow)
  eventManager.setMainWindow(mainWindow)

  mainWindow.on('ready-to-show', () => {
    mainWindow.show()
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  // HMR for renderer base on electron-vite cli.
  // Load the remote URL for development or the local html file for production.
  if (!app.isPackaged && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}
```

**File:** `lib/main/main.ts` (MODIFY - Add environment loading)

```typescript
import { app, BrowserWindow } from 'electron'
import { electronApp, optimizer } from '@electron-toolkit/utils'
import { createAppWindow } from './app'
import { updateManager } from './updater'

// Load environment variables
import { config } from 'dotenv'
config()

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(() => {
  // Set app user model id for windows
  electronApp.setAppUserModelId('com.electron')

  // Create app window
  createAppWindow()

  // Initialize auto-updater
  updateManager.initialize()

  // Default open or close DevTools by F12 in development
  // and ignore CommandOrControl + R in production.
  // see https://github.com/alex8088/electron-toolkit/tree/master/packages/utils
  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  app.on('activate', function () {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) {
      createAppWindow()
    }
  })
})

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    updateManager.cleanup()
    app.quit()
  }
})

// In this file, you can include the rest of your app's specific main process
// code. You can also put them in separate files and import them here.
```

---

## Usage Examples

### Example 1: Simple OpenAI Chat

**React Component:**
```typescript
import { useState } from 'react'
import { useConveyor } from '@/app/hooks/useConveyor'

export function ChatComponent() {
  const { ai } = useConveyor()
  const [prompt, setPrompt] = useState('')
  const [response, setResponse] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const result = await ai.chat(prompt)
      setResponse(result)
    } catch (error) {
      console.error('Chat error:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <form onSubmit={handleSubmit}>
        <input
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="Ask me anything..."
        />
        <button type="submit" disabled={loading}>
          {loading ? 'Thinking...' : 'Send'}
        </button>
      </form>
      {response && <div>{response}</div>}
    </div>
  )
}
```

### Example 2: Streaming Chat

```typescript
import { useState } from 'react'
import { useConveyor } from '@/app/hooks/useConveyor'
import { useStreamingResponse } from '@/app/hooks/useStreamingResponse'

export function StreamingChat() {
  const { ai } = useConveyor()
  const [prompt, setPrompt] = useState('')
  const [requestId, setRequestId] = useState<string | null>(null)
  const { content, isStreaming } = useStreamingResponse(requestId)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    const { requestId: newRequestId } = await ai.chatStream(prompt)
    setRequestId(newRequestId)
  }

  return (
    <div>
      <form onSubmit={handleSubmit}>
        <input
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="Ask me anything..."
        />
        <button type="submit" disabled={isStreaming}>
          {isStreaming ? 'Streaming...' : 'Send'}
        </button>
      </form>
      <div className="response">
        {content}
        {isStreaming && <span className="cursor">|</span>}
      </div>
    </div>
  )
}
```

### Example 3: Database Query

```typescript
import { useState, useEffect } from 'react'
import { useConveyor } from '@/app/hooks/useConveyor'

interface User {
  id: number
  name: string
  email: string
}

export function UserList() {
  const { db } = useConveyor()
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadUsers()
  }, [])

  const loadUsers = async () => {
    try {
      const result = await db.query<User>('SELECT * FROM users ORDER BY id')
      setUsers(result.rows)
    } catch (error) {
      console.error('Failed to load users:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) return <div>Loading...</div>

  return (
    <ul>
      {users.map((user) => (
        <li key={user.id}>
          {user.name} - {user.email}
        </li>
      ))}
    </ul>
  )
}
```

### Example 4: Inngest Background Job

```typescript
import { useState } from 'react'
import { useConveyor } from '@/app/hooks/useConveyor'
import { useConveyorEvent } from '@/app/hooks/useConveyorEvent'

export function BackgroundJobComponent() {
  const { inngest } = useConveyor()
  const [jobId, setJobId] = useState<string | null>(null)
  const [progress, setProgress] = useState(0)
  const [status, setStatus] = useState<string>('')

  // Listen for job progress
  useConveyorEvent('inngest:job-progress', (data) => {
    if (data.jobId === jobId) {
      setProgress(data.progress)
      setStatus(data.status)
    }
  })

  // Listen for job completion
  useConveyorEvent('inngest:job-completed', (data) => {
    if (data.jobId === jobId) {
      console.log('Job completed!', data.result)
    }
  })

  const startJob = async () => {
    const { jobId: newJobId } = await inngest.sendJob('generate-report', {
      userId: 123,
      reportType: 'monthly',
    })
    setJobId(newJobId)
  }

  return (
    <div>
      <button onClick={startJob}>Start Background Job</button>
      {jobId && (
        <div>
          <p>Job ID: {jobId}</p>
          <p>Status: {status}</p>
          <p>Progress: {progress}%</p>
          <progress value={progress} max={100} />
        </div>
      )}
    </div>
  )
}
```

### Example 5: VoltAgent Orchestration

```typescript
import { useState } from 'react'
import { useConveyor } from '@/app/hooks/useConveyor'
import { useConveyorEvent } from '@/app/hooks/useConveyorEvent'

export function AgentComponent() {
  const { voltagent } = useConveyor()
  const [agentId, setAgentId] = useState<string | null>(null)
  const [thoughts, setThoughts] = useState<string[]>([])
  const [response, setResponse] = useState('')

  // Listen for agent thinking
  useConveyorEvent('voltagent:agent-thinking', (data) => {
    if (data.agentId === agentId) {
      setThoughts((prev) => [...prev, data.thought])
    }
  })

  // Listen for agent response
  useConveyorEvent('voltagent:agent-response', (data) => {
    if (data.agentId === agentId) {
      setResponse(data.response)
    }
  })

  const runAgent = async () => {
    setThoughts([])
    setResponse('')

    const { agentId: newAgentId } = await voltagent.runAgent(
      'Analyze the latest sales data and provide insights'
    )
    setAgentId(newAgentId)
  }

  return (
    <div>
      <button onClick={runAgent}>Run Agent</button>

      {thoughts.length > 0 && (
        <div className="thoughts">
          <h3>Agent Thoughts:</h3>
          {thoughts.map((thought, i) => (
            <p key={i}>{thought}</p>
          ))}
        </div>
      )}

      {response && (
        <div className="response">
          <h3>Agent Response:</h3>
          <p>{response}</p>
        </div>
      )}
    </div>
  )
}
```

---

## Testing Strategy

### Unit Tests

**Test Services:**
```typescript
// lib/main/services/__tests__/openai-service.test.ts
import { OpenAIService } from '../openai-service'

describe('OpenAIService', () => {
  let service: OpenAIService

  beforeEach(() => {
    service = new OpenAIService()
  })

  it('should create chat completion', async () => {
    const result = await service.chat('Hello')
    expect(result).toBeDefined()
    expect(typeof result).toBe('string')
  })

  it('should create streaming completion', async () => {
    const { requestId } = await service.chatStream('Hello')
    expect(requestId).toBeDefined()
  })
})
```

**Test Handlers:**
```typescript
// lib/conveyor/handlers/__tests__/ai-handler.test.ts
import { ipcMain } from 'electron'
import { registerAiHandlers } from '../ai-handler'

describe('AI Handlers', () => {
  beforeAll(() => {
    registerAiHandlers()
  })

  it('should handle ai-chat', async () => {
    const result = await ipcMain.handle('ai-chat', 'Hello')
    expect(result).toBeDefined()
  })
})
```

### Integration Tests

**Test End-to-End Flow:**
```typescript
// Test from React component → Conveyor → Service
describe('E2E: Chat Flow', () => {
  it('should complete chat request', async () => {
    const result = await window.conveyor.ai.chat('Hello')
    expect(result).toBeDefined()
  })

  it('should stream chat response', (done) => {
    let chunks = 0

    window.conveyor.ai.on('ai:stream-chunk', (data) => {
      chunks++
    })

    window.conveyor.ai.on('ai:stream-end', () => {
      expect(chunks).toBeGreaterThan(0)
      done()
    })

    window.conveyor.ai.chatStream('Tell me a story')
  })
})
```

---

## Next Steps

### Installation

1. **Install dependencies:**
   ```bash
   npm install openai pg inngest dotenv
   npm install -D @types/pg
   ```

2. **Setup environment:**
   ```bash
   cp .env.example .env
   # Edit .env with your actual credentials
   ```

3. **Follow implementation phases sequentially:**
   - Phase 1: Event system (foundation)
   - Phase 2: Configuration (required for services)
   - Phase 3: Services (business logic)
   - Phase 4: Conveyor integration (wire everything)
   - Phase 5: Testing (ensure reliability)

### Development Workflow

1. **Start with one service** (recommended: OpenAI)
2. **Test thoroughly** before moving to the next
3. **Add features incrementally** as needed
4. **Document edge cases** and error scenarios

### Production Considerations

- [ ] Add rate limiting for API calls
- [ ] Implement request queuing
- [ ] Add comprehensive error handling
- [ ] Setup logging aggregation
- [ ] Add metrics/monitoring
- [ ] Implement retry logic
- [ ] Add request cancellation
- [ ] Setup connection pooling
- [ ] Add request timeouts
- [ ] Implement caching where appropriate

---

## Summary

This implementation plan provides a **production-ready foundation** for your Electron app with:

✅ **Event-driven architecture** for real-time updates
✅ **Type-safe communication** with Zod validation
✅ **Service layer** for OpenAI, Postgres, Inngest, VoltAgent
✅ **Streaming support** for LLM responses
✅ **Background job management** with progress tracking
✅ **Follows existing patterns** in your codebase
✅ **Extensible architecture** for future features

The architecture is designed to scale with your needs while maintaining code quality and type safety throughout.
