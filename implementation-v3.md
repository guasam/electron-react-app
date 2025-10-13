# Implementation Plan v3: VoltAgent + AI SDK Architecture

## Table of Contents
1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Core Principles](#core-principles)
4. [Technology Stack](#technology-stack)
5. [Implementation Phases](#implementation-phases)
6. [File Structure](#file-structure)
7. [Detailed Implementation](#detailed-implementation)
8. [Testing Strategy](#testing-strategy)
9. [Security Considerations](#security-considerations)
10. [Production Deployment](#production-deployment)

---

## Overview

This document outlines the implementation plan using VoltAgent with Vercel's AI SDK as the central LLM orchestration layer. VoltAgent provides agent orchestration while the AI SDK handles provider abstraction.

### Key Architecture Points
- **VoltAgent + AI SDK**: VoltAgent uses AI SDK providers directly
- **Unified Provider Interface**: AI SDK abstracts OpenAI, Anthropic, etc.
- **Agent-First Design**: Built for agent workflows with tool use
- **Offline-First SQLite**: Local database with Prisma ORM
- **Secure Credential Management**: Using Electron's native APIs
- **Type-Safe End-to-End**: Full TypeScript with runtime validation

### What VoltAgent Provides
- ✅ **Agent orchestration** - Multi-step workflows with tools
- ✅ **Built on AI SDK** - Uses `@ai-sdk/openai`, `@ai-sdk/anthropic`, etc.
- ✅ **Tool management** - Register and execute functions
- ✅ **Structured outputs** - Type-safe responses
- ✅ **Streaming support** - Unified streaming interface

### What AI SDK Provides
- ✅ **Provider abstraction** - Common interface for all LLMs
- ✅ **Model management** - Easy model switching
- ✅ **Token counting** - Built-in usage tracking
- ✅ **Error handling** - Consistent error types
- ✅ **Streaming** - Unified streaming API

### Goals
- 🎯 **Leverage VoltAgent** - Use VoltAgent's agent capabilities
- 🎯 **AI SDK Integration** - Use AI SDK for provider management
- 🎯 **Agent Workflows** - First-class support for multi-step processes
- 🎯 **Type Safety** - Full TypeScript throughout
- 🎯 **Production Ready** - Error handling, monitoring, security

---

## Architecture

### VoltAgent + AI SDK Architecture

```
┌─────────────────────────────────────────────────┐
│           React UI (Renderer Process)           │
│                                                  │
│  ├── useAgent() - Agent interactions            │
│  ├── useChat() - Chat conversations             │
│  └── useTools() - Tool/function calling         │
└─────────────────────────────────────────────────┘
                       ↕ IPC
┌─────────────────────────────────────────────────┐
│         Conveyor Layer (Type-Safe IPC)          │
│                                                  │
│  ├── Agent Schemas (chat, agents, tools)        │
│  ├── Agent API (client methods)                 │
│  └── Agent Handlers (server implementation)     │
└─────────────────────────────────────────────────┘
                       ↕
┌─────────────────────────────────────────────────┐
│       VoltAgent Service (Main Process)          │
│                                                  │
│  ┌─────────────────────────────────────────┐   │
│  │      VoltAgent Core (@voltagent/core)    │   │
│  │                                           │   │
│  │  ├── Agent Class (orchestration)         │   │
│  │  ├── Tool Registry (function calling)    │   │
│  │  ├── Context Management                  │   │
│  │  └── Structured Outputs                  │   │
│  └─────────────────────────────────────────┘   │
│                                                  │
│  ┌─────────────────────────────────────────┐   │
│  │       AI SDK Providers (Vercel)          │   │
│  │                                           │   │
│  │  ├── @ai-sdk/openai (GPT models)        │   │
│  │  ├── @ai-sdk/anthropic (Claude)         │   │
│  │  ├── @ai-sdk/google (Gemini)            │   │
│  │  └── @ai-sdk/mistral (Mistral)          │   │
│  └─────────────────────────────────────────┘   │
└─────────────────────────────────────────────────┘
                       ↕
┌─────────────────────────────────────────────────┐
│           Service Layer (Supporting)            │
│                                                  │
│  ├── Database Service (Prisma + SQLite)         │
│  ├── Storage Service (Secure credentials)       │
│  ├── Worker Service (Background tasks)          │
│  └── Event Bus (Real-time updates)              │
└─────────────────────────────────────────────────┘

```

### Data Flow Examples

#### Simple Chat
```
User Input → React → Conveyor → VoltAgent Agent → AI SDK Provider → LLM API
                                      ↓
                              Context Management
                                      ↓
                              AI SDK Token Counting
                                      ↓
                              Response/Streaming
                                      ↓
User Response ← React ← Conveyor ← VoltAgent Response
```

#### Agent with Tools
```
Agent Request → VoltAgent Agent → Tool Registration
                      ↓
                Agent.run() with AI SDK Model
                      ↓
                Tool Invocation
                      ↓
                Function Execution
                      ↓
                Result Processing
                      ↓
                Context Update
                      ↓
                Next Step or Complete
```

---

## Core Principles

### 1. **VoltAgent First**
- All LLM operations go through VoltAgent
- No direct provider calls from other services
- Unified interface for chat, completion, and agents
- Consistent error handling and retries

### 2. **Agent-Oriented Design**
- First-class support for agent workflows
- Tool registration and discovery
- Multi-step execution with state management
- Parallel tool execution when possible

### 3. **Provider Abstraction**
- Common interface for all LLM providers
- Provider-specific optimizations hidden
- Easy to add new providers
- Fallback and load balancing support

### 4. **Context Intelligence**
- Automatic context window management
- Conversation history tracking
- Context compression when needed
- Token optimization strategies

### 5. **Lean but Extensible**
- Start with core features
- Clear extension points
- Plugin architecture for tools
- Modular provider system

---

## Technology Stack

### Core Dependencies
```json
{
  "dependencies": {
    // VoltAgent & AI SDK
    "@voltagent/core": "latest",        // Agent orchestration
    "@voltagent/server-hono": "latest",  // HTTP server (optional)
    "ai": "^3.x",                        // Vercel AI SDK core
    "@ai-sdk/openai": "latest",          // OpenAI provider
    "@ai-sdk/anthropic": "latest",       // Anthropic provider
    "@ai-sdk/google": "latest",          // Google provider (optional)

    // Database & ORM
    "@prisma/client": "^5.x",
    "better-sqlite3": "^9.x",

    // Core Libraries
    "zod": "^3.x",                      // Schema validation
    "p-queue": "^7.x",                  // Queue management
    "exponential-backoff": "^3.x",      // Retry logic
    "eventemitter3": "^5.x",            // Event system

    // Utilities
    "electron-log": "^5.x"              // Logging
  },
  "devDependencies": {
    "prisma": "^5.x",
    "vitest": "^1.x",
    "@faker-js/faker": "^8.x",
    "msw": "^2.x"
  }
}
```

### Why VoltAgent + AI SDK?
- **VoltAgent**: Provides agent orchestration, tool management, and structured outputs
- **AI SDK**: Unified interface for all LLM providers with built-in streaming
- **Type Safety**: Both libraries are fully typed with TypeScript
- **Production Ready**: Battle-tested in production applications
- **Model Flexibility**: Easy to switch between providers and models

---

## Implementation Phases

### Phase 1: VoltAgent Core & Foundation (Week 1)

#### 1.1 VoltAgent Service Architecture
- Base VoltAgent service with lifecycle
- Provider adapter interface
- OpenAI provider implementation
- Mock provider for testing
- Service registration with manager

#### 1.2 Core Components
- **Agent Engine**: Workflow execution
- **Context Manager**: Conversation state
- **Tool Registry**: Function registration
- **Token Manager**: Usage tracking
- **Stream Processor**: Unified streaming

#### 1.3 Database & Storage (from v2)
- Prisma + SQLite setup
- Secure credential storage
- Settings management
- Cache layer

#### 1.4 IPC Integration
- VoltAgent schemas
- Chat operations
- Agent operations
- Tool operations
- Streaming events

### Phase 2: Agent Capabilities (Week 1-2)

#### 2.1 Agent Workflows
- Multi-step planning
- Tool selection logic
- Execution monitoring
- State management
- Error recovery

#### 2.2 Tool System
- Built-in tools (search, calculate, etc.)
- Custom tool registration
- Tool validation
- Parallel execution
- Result processing

#### 2.3 Context Management
- Sliding window implementation
- Context compression
- Message prioritization
- Token optimization
- History persistence

### Phase 3: Provider Expansion (Week 2)

#### 3.1 Additional Providers
- Anthropic Claude provider
- Local model provider (Ollama)
- Provider switching logic
- Fallback strategies

#### 3.2 Advanced Features
- Request batching
- Response caching
- Cost tracking
- Usage analytics
- Performance monitoring

### Phase 4: Production Features (Week 3)

#### 4.1 Reliability
- Circuit breaker pattern
- Retry strategies
- Rate limit handling
- Error recovery
- Graceful degradation

#### 4.2 Testing & Quality
- Unit tests for VoltAgent
- Integration tests
- Provider mock testing
- Performance benchmarks
- Load testing

#### 4.3 Monitoring
- Token usage tracking
- Cost monitoring
- Performance metrics
- Error reporting
- Usage analytics

---

## File Structure

```
/Users/mac/dev/apo/apo-internal/
│
├── prisma/
│   ├── schema.prisma              # Database schema
│   └── migrations/                # Migration history
│
├── lib/
│   ├── conveyor/
│   │   ├── schemas/
│   │   │   ├── voltagent.schema.ts  # VoltAgent operations
│   │   │   ├── user.schema.ts       # User operations
│   │   │   └── index.ts             # Schema exports
│   │   │
│   │   ├── api/
│   │   │   ├── voltagent.api.ts     # VoltAgent client API
│   │   │   └── index.ts             # API exports
│   │   │
│   │   └── handlers/
│   │       ├── voltagent.handler.ts # VoltAgent handlers
│   │       └── index.ts             # Handler registration
│   │
│   ├── main/
│   │   ├── services/
│   │   │   ├── base/
│   │   │   │   ├── service.base.ts      # Base service class
│   │   │   │   └── service.manager.ts   # Service lifecycle
│   │   │   │
│   │   │   ├── voltagent/
│   │   │   │   ├── voltagent.service.ts # Main VoltAgent service
│   │   │   │   │
│   │   │   │   ├── core/
│   │   │   │   │   ├── agent.engine.ts      # Agent execution
│   │   │   │   │   ├── context.manager.ts   # Context management
│   │   │   │   │   ├── tool.registry.ts     # Tool registration
│   │   │   │   │   ├── token.manager.ts     # Token counting
│   │   │   │   │   └── stream.processor.ts  # Stream handling
│   │   │   │   │
│   │   │   │   ├── providers/
│   │   │   │   │   ├── base.provider.ts     # Provider interface
│   │   │   │   │   ├── openai.provider.ts   # OpenAI implementation
│   │   │   │   │   ├── anthropic.provider.ts # Claude implementation
│   │   │   │   │   └── mock.provider.ts     # Testing provider
│   │   │   │   │
│   │   │   │   ├── tools/
│   │   │   │   │   ├── base.tool.ts         # Tool interface
│   │   │   │   │   ├── search.tool.ts       # Web search tool
│   │   │   │   │   ├── database.tool.ts     # Database query tool
│   │   │   │   │   └── calculator.tool.ts   # Math tool
│   │   │   │   │
│   │   │   │   └── types/
│   │   │   │       ├── agent.types.ts       # Agent types
│   │   │   │       ├── provider.types.ts    # Provider types
│   │   │   │       └── tool.types.ts        # Tool types
│   │   │   │
│   │   │   ├── database/
│   │   │   │   └── database.service.ts      # Prisma + SQLite
│   │   │   │
│   │   │   ├── storage/
│   │   │   │   └── storage.service.ts       # Secure credentials
│   │   │   │
│   │   │   └── worker/
│   │   │       └── worker.service.ts        # Background tasks
│   │   │
│   │   └── main.ts                          # Entry point
│   │
│   └── preload/
│       └── preload.ts                       # API exposure
│
└── app/
    ├── hooks/
    │   ├── useVoltAgent.ts          # VoltAgent hook
    │   ├── useChat.ts               # Chat hook
    │   └── useTools.ts              # Tool usage hook
    │
    └── components/
        ├── chat/                    # Chat UI components
        └── agent/                   # Agent UI components
```

---

## Detailed Implementation

### Phase 1: VoltAgent + AI SDK Core

#### 1.1 VoltAgent Service with AI SDK

**File:** `lib/main/services/agent/agent.service.ts`

```typescript
import { Agent, VoltAgent } from '@voltagent/core'
import { openai } from '@ai-sdk/openai'
import { anthropic } from '@ai-sdk/anthropic'
import { BaseService } from '../base/service.base'
import { serviceManager } from '../base/service.manager'
import { StorageService } from '../storage/storage.service'
import { DatabaseService } from '../database/database.service'
import { z } from 'zod'
import log from 'electron-log/main'

export class AgentService extends BaseService {
  private agents = new Map<string, Agent>()
  private voltAgent: VoltAgent | null = null
  private activeModel: any = null

  constructor() {
    super({ name: 'agent' })
  }

  /**
   * Initialize Agent service
   */
  protected async onInitialize(): Promise<void> {
    const storage = serviceManager.get<StorageService>('storage')

    // Get API keys from secure storage
    const openaiKey = await storage.getCredential('openai', 'api_key')
    const anthropicKey = await storage.getCredential('anthropic', 'api_key')

    // Configure AI SDK providers
    if (openaiKey) {
      process.env.OPENAI_API_KEY = openaiKey
      this.activeModel = openai('gpt-4o-mini')
    } else if (anthropicKey) {
      process.env.ANTHROPIC_API_KEY = anthropicKey
      this.activeModel = anthropic('claude-3-haiku-20240307')
    }

    // Create default agent
    this.createDefaultAgent()

    // Initialize VoltAgent (optional for HTTP server)
    // In Electron, we'll mainly use agents directly via IPC
    this.voltAgent = new VoltAgent({
      agents: Object.fromEntries(this.agents),
      // We don't need the HTTP server in Electron
      // server: honoServer(),
    })

    log.info('Agent service initialized')
  }

  /**
   * Create default agent
   */
  private createDefaultAgent(): void {
    const defaultAgent = new Agent({
      name: 'assistant',
      instructions: 'You are a helpful AI assistant. Answer questions clearly and concisely.',
      model: this.activeModel,
      tools: this.getBuiltInTools(),
    })

    this.agents.set('assistant', defaultAgent)
  }

  /**
   * Create custom agent
   */
  createAgent(config: {
    name: string
    instructions: string
    model?: string
    tools?: any[]
  }): Agent {
    // Select model based on config
    let model = this.activeModel
    if (config.model) {
      if (config.model.startsWith('gpt')) {
        model = openai(config.model)
      } else if (config.model.startsWith('claude')) {
        model = anthropic(config.model)
      }
    }

    const agent = new Agent({
      name: config.name,
      instructions: config.instructions,
      model,
      tools: config.tools || this.getBuiltInTools(),
    })

    this.agents.set(config.name, agent)
    return agent
  }

  /**
   * Get or create agent
   */
  getAgent(name: string = 'assistant'): Agent {
    let agent = this.agents.get(name)
    if (!agent) {
      agent = this.createAgent({
        name,
        instructions: `You are ${name}. Be helpful and informative.`,
      })
    }
    return agent
  }

  /**
   * Run agent with prompt
   */
  async run(
    prompt: string,
    options: {
      agentName?: string
      stream?: boolean
      userId?: string
      conversationId?: string
    } = {}
  ) {
    const agent = this.getAgent(options.agentName)

    try {
      // Run agent
      const result = await agent.run(prompt, {
        stream: options.stream,
      })

      // Save to database if user context provided
      if (options.userId) {
        await this.saveConversation(
          options.userId,
          options.conversationId,
          prompt,
          result
        )
      }

      return result
    } catch (error) {
      log.error('Agent run error:', error)
      throw error
    }
  }

  /**
   * Stream agent response
   */
  async *stream(
    prompt: string,
    options: {
      agentName?: string
      userId?: string
      conversationId?: string
    } = {}
  ) {
    const agent = this.getAgent(options.agentName)

    try {
      // Stream from agent
      const stream = await agent.run(prompt, {
        stream: true,
      })

      // Process stream
      for await (const chunk of stream) {
        yield chunk
      }

      // Save conversation after streaming
      if (options.userId) {
        // Note: Need to accumulate response for saving
      }
    } catch (error) {
      log.error('Agent stream error:', error)
      throw error
    }
  }

  /**
   * Get built-in tools
   */
  private getBuiltInTools() {
    const database = serviceManager.get<DatabaseService>('database')

    return [
      // Database query tool
      {
        name: 'query_database',
        description: 'Query the local SQLite database',
        parameters: z.object({
          query: z.string().describe('SQL query to execute'),
        }),
        execute: async ({ query }: { query: string }) => {
          return await database.prisma.$queryRawUnsafe(query)
        },
      },

      // Calculator tool
      {
        name: 'calculate',
        description: 'Perform mathematical calculations',
        parameters: z.object({
          expression: z.string().describe('Mathematical expression'),
        }),
        execute: async ({ expression }: { expression: string }) => {
          try {
            const result = Function('"use strict"; return (' + expression + ')')()
            return { result }
          } catch (error) {
            return { error: 'Invalid expression' }
          }
        },
      },

      // File operations tool
      {
        name: 'read_file',
        description: 'Read contents of a file',
        parameters: z.object({
          path: z.string().describe('File path to read'),
        }),
        execute: async ({ path }: { path: string }) => {
          const fs = require('fs').promises
          return await fs.readFile(path, 'utf-8')
        },
      },
    ]
  }

  /**
   * Register custom tool
   */
  registerTool(tool: {
    name: string
    description: string
    parameters: z.ZodSchema
    execute: (args: any) => Promise<any>
  }) {
    // Add tool to all agents
    for (const agent of this.agents.values()) {
      agent.tools.push(tool)
    }
  }

  /**
   * Save conversation to database
   */
  private async saveConversation(
    userId: string,
    conversationId: string | undefined,
    prompt: string,
    response: any
  ) {
    const database = serviceManager.get<DatabaseService>('database')

    try {
      const responseText = typeof response === 'string'
        ? response
        : JSON.stringify(response)

      if (conversationId) {
        await database.prisma.conversation.update({
          where: { id: conversationId },
          data: {
            messages: {
              push: [
                { role: 'user', content: prompt, timestamp: new Date() },
                { role: 'assistant', content: responseText, timestamp: new Date() }
              ]
            },
            updatedAt: new Date()
          }
        })
      } else {
        await database.prisma.conversation.create({
          data: {
            userId,
            title: prompt.substring(0, 100),
            model: 'voltagent',
            messages: [
              { role: 'user', content: prompt, timestamp: new Date() },
              { role: 'assistant', content: responseText, timestamp: new Date() }
            ]
          }
        })
      }
    } catch (error) {
      log.error('Failed to save conversation:', error)
    }
  }

  /**
   * Dispose service
   */
  protected async onDispose(): Promise<void> {
    this.agents.clear()
    this.voltAgent = null
  }
}
```

#### 1.2 IPC Integration

**File:** `lib/conveyor/schemas/agent.schema.ts`

```typescript
import { z } from 'zod'

export const agentIpcSchema = {
  // Run agent
  'agent:run': {
    args: z.tuple([
      z.string(), // prompt
      z.object({
        agentName: z.string().optional(),
        stream: z.boolean().optional(),
        userId: z.string().optional(),
        conversationId: z.string().optional(),
      }).optional()
    ]),
    return: z.any() // Agent response can vary
  },

  // Stream agent response
  'agent:stream': {
    args: z.tuple([
      z.string(), // prompt
      z.object({
        agentName: z.string().optional(),
        userId: z.string().optional(),
        conversationId: z.string().optional(),
      }).optional()
    ]),
    return: z.string() // streamId
  },

  // Create custom agent
  'agent:create': {
    args: z.tuple([
      z.object({
        name: z.string(),
        instructions: z.string(),
        model: z.string().optional(),
        tools: z.array(z.any()).optional(),
      })
    ]),
    return: z.void()
  },

  // Register tool
  'agent:register-tool': {
    args: z.tuple([
      z.object({
        name: z.string(),
        description: z.string(),
        parameters: z.any(), // Zod schema as JSON
        code: z.string(), // Function code
      })
    ]),
    return: z.void()
  },

  // Get available agents
  'agent:list': {
    args: z.tuple([]),
    return: z.array(z.object({
      name: z.string(),
      instructions: z.string(),
    }))
  },

  // Switch model
  'agent:set-model': {
    args: z.tuple([
      z.enum(['openai', 'anthropic', 'google']),
      z.string(), // model name
    ]),
    return: z.void()
  }
} as const
```

**File:** `lib/conveyor/handlers/agent.handler.ts`

```typescript
import { handle } from '@/lib/main/shared'
import { serviceManager } from '@/lib/main/services/base/service.manager'
import { AgentService } from '@/lib/main/services/agent/agent.service'
import { eventManager } from '@/lib/conveyor/events/event-manager'
import log from 'electron-log/main'

export function registerAgentHandlers() {
  const agent = serviceManager.get<AgentService>('agent')

  // Run agent
  handle('agent:run', async (prompt: string, options?: any) => {
    return await agent.run(prompt, options)
  })

  // Stream agent response
  handle('agent:stream', async (prompt: string, options?: any) => {
    const streamId = `stream-${Date.now()}`

    // Start streaming in background
    (async () => {
      try {
        for await (const chunk of agent.stream(prompt, options)) {
          eventManager.emit('agent:stream-chunk', {
            streamId,
            chunk
          })
        }

        eventManager.emit('agent:stream-end', { streamId })
      } catch (error) {
        log.error('Stream error:', error)
        eventManager.emit('agent:stream-error', {
          streamId,
          error: error instanceof Error ? error.message : 'Unknown error'
        })
      }
    })()

    return streamId
  })

  // Create custom agent
  handle('agent:create', async (config: any) => {
    agent.createAgent(config)
  })

  // Register tool
  handle('agent:register-tool', async (toolDef: any) => {
    // Parse the function code and create executable
    const execute = new Function('return ' + toolDef.code)()

    agent.registerTool({
      name: toolDef.name,
      description: toolDef.description,
      parameters: toolDef.parameters,
      execute
    })
  })

  // Get available agents
  handle('agent:list', async () => {
    // Return list of agents
    return [] // TODO: Implement agent listing
  })

  // Switch model
  handle('agent:set-model', async (provider: string, model: string) => {
    // TODO: Implement model switching
    log.info(`Switching to ${provider} model: ${model}`)
  })
}
```

#### 1.3 React Hook for Agent

**File:** `app/hooks/useAgent.ts`

```typescript
import { useState, useCallback, useRef } from 'react'
import { useConveyor } from './useConveyor'
import { useConveyorEvent } from './useConveyorEvent'

interface AgentOptions {
  agentName?: string
  stream?: boolean
  userId?: string
  conversationId?: string
}

export function useAgent() {
  const conveyor = useConveyor()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  const [streamContent, setStreamContent] = useState('')
  const streamIdRef = useRef<string | null>(null)

  // Run agent
  const run = useCallback(async (
    prompt: string,
    options?: AgentOptions
  ) => {
    setIsLoading(true)
    setError(null)

    try {
      const result = await conveyor.agent.run(prompt, options)
      return result
    } catch (err) {
      const error = err as Error
      setError(error)
      throw error
    } finally {
      setIsLoading(false)
    }
  }, [conveyor])

  // Stream agent response
  const stream = useCallback(async (
    prompt: string,
    options?: AgentOptions
  ) => {
    setIsLoading(true)
    setError(null)
    setStreamContent('')

    try {
      const streamId = await conveyor.agent.stream(prompt, options)
      streamIdRef.current = streamId
      return streamId
    } catch (err) {
      const error = err as Error
      setError(error)
      throw error
    }
  }, [conveyor])

  // Listen for stream chunks
  useConveyorEvent('agent:stream-chunk', (data) => {
    if (data.streamId === streamIdRef.current) {
      setStreamContent(prev => prev + data.chunk)
    }
  })

  // Listen for stream end
  useConveyorEvent('agent:stream-end', (data) => {
    if (data.streamId === streamIdRef.current) {
      setIsLoading(false)
      streamIdRef.current = null
    }
  })

  // Listen for stream errors
  useConveyorEvent('agent:stream-error', (data) => {
    if (data.streamId === streamIdRef.current) {
      setError(new Error(data.error))
      setIsLoading(false)
      streamIdRef.current = null
    }
  })

  // Create custom agent
  const createAgent = useCallback(async (config: {
    name: string
    instructions: string
    model?: string
    tools?: any[]
  }) => {
    await conveyor.agent.create(config)
  }, [conveyor])

  // Register tool
  const registerTool = useCallback(async (tool: {
    name: string
    description: string
    parameters: any
    code: string
  }) => {
    await conveyor.agent.registerTool(tool)
  }, [conveyor])

  return {
    // State
    isLoading,
    error,
    streamContent,

    // Methods
    run,
    stream,
    createAgent,
    registerTool
  }
}
```

  /**
   * Initialize the provider
   */
  async initialize(config: any): Promise<void> {
    if (this.initialized) {
      throw new Error(`Provider ${this.name} already initialized`)
    }

    this.config = config
    await this.onInitialize()
    this.initialized = true
    log.info(`Provider initialized: ${this.name}`)
  }

  /**
   * Dispose the provider
   */
  async dispose(): Promise<void> {
    if (!this.initialized) return

    await this.onDispose()
    this.initialized = false
    log.info(`Provider disposed: ${this.name}`)
  }

  /**
   * Check if provider is available
   */
  async isAvailable(): Promise<boolean> {
    if (!this.initialized) return false

    try {
      return await this.checkAvailability()
    } catch (error) {
      log.error(`Provider availability check failed: ${this.name}`, error)
      return false
    }
  }

  /**
   * Count tokens in text
   */
  countTokens(text: string, model?: string): number {
    // Default implementation - override in provider
    return Math.ceil(text.length / 4)
  }

  // Abstract methods for providers to implement
  protected abstract onInitialize(): Promise<void>
  protected abstract onDispose(): Promise<void>
  protected abstract checkAvailability(): Promise<boolean>

  abstract chat(messages: Message[], options?: ChatOptions): Promise<ChatResponse>
  abstract chatStream(
    messages: Message[],
    options?: ChatOptions
  ): AsyncGenerator<StreamChunk, void, unknown>
}
```

#### 1.3 OpenAI Provider

**File:** `lib/main/services/voltagent/providers/openai.provider.ts`

```typescript
import { BaseProvider } from './base.provider'
import { Message, ChatOptions, ChatResponse, StreamChunk, ProviderCapabilities } from '../types/provider.types'
import OpenAI from 'openai'
import { backOff } from 'exponential-backoff'
import log from 'electron-log/main'
import { randomUUID } from 'crypto'

export class OpenAIProvider extends BaseProvider {
  name = 'openai'
  capabilities: ProviderCapabilities = {
    chat: true,
    streaming: true,
    functions: true,
    vision: true,
    embeddings: true,
    maxTokens: 128000, // GPT-4 Turbo
    models: [
      'gpt-4-turbo-preview',
      'gpt-4',
      'gpt-3.5-turbo',
      'gpt-3.5-turbo-16k'
    ]
  }

  private client: OpenAI | null = null

  /**
   * Initialize OpenAI provider
   */
  protected async onInitialize(): Promise<void> {
    const { apiKey, organization } = this.config

    if (!apiKey) {
      throw new Error('OpenAI API key is required')
    }

    this.client = new OpenAI({
      apiKey,
      organization,
      maxRetries: 3
    })

    // Test connection
    await this.checkAvailability()
  }

  /**
   * Dispose OpenAI provider
   */
  protected async onDispose(): Promise<void> {
    this.client = null
  }

  /**
   * Check if OpenAI is available
   */
  protected async checkAvailability(): Promise<boolean> {
    if (!this.client) return false

    try {
      await this.client.models.list()
      return true
    } catch (error) {
      log.error('OpenAI availability check failed:', error)
      return false
    }
  }

  /**
   * Convert messages to OpenAI format
   */
  private formatMessages(messages: Message[]): OpenAI.Chat.ChatCompletionMessageParam[] {
    return messages.map(msg => {
      const formatted: OpenAI.Chat.ChatCompletionMessageParam = {
        role: msg.role as any,
        content: msg.content
      }

      if (msg.name) {
        (formatted as any).name = msg.name
      }

      if (msg.function_call) {
        (formatted as any).function_call = msg.function_call
      }

      return formatted
    })
  }

  /**
   * Chat completion
   */
  async chat(messages: Message[], options: ChatOptions = {}): Promise<ChatResponse> {
    if (!this.client) throw new Error('OpenAI client not initialized')

    const {
      model = 'gpt-4-turbo-preview',
      temperature = 0.7,
      maxTokens = 2000,
      topP,
      frequencyPenalty,
      presencePenalty,
      stopSequences,
      tools
    } = options

    try {
      const response = await backOff(
        async () => {
          const params: OpenAI.Chat.ChatCompletionCreateParams = {
            model,
            messages: this.formatMessages(messages),
            temperature,
            max_tokens: maxTokens,
            top_p: topP,
            frequency_penalty: frequencyPenalty,
            presence_penalty: presencePenalty,
            stop: stopSequences
          }

          // Add tools if provided
          if (tools && tools.length > 0) {
            params.functions = tools.map(tool => ({
              name: tool.name,
              description: tool.description,
              parameters: tool.parameters as any
            }))
          }

          return await this.client!.chat.completions.create(params)
        },
        {
          numOfAttempts: 3,
          startingDelay: 1000,
          retry: (error: any) => {
            return error?.status >= 500 || error?.status === 429
          }
        }
      )

      const choice = response.choices[0]
      const result: ChatResponse = {
        id: response.id,
        content: choice.message.content || '',
        model: response.model,
        usage: response.usage ? {
          promptTokens: response.usage.prompt_tokens,
          completionTokens: response.usage.completion_tokens,
          totalTokens: response.usage.total_tokens
        } : undefined
      }

      if (choice.message.function_call) {
        result.functionCall = {
          name: choice.message.function_call.name,
          arguments: JSON.parse(choice.message.function_call.arguments)
        }
      }

      return result
    } catch (error) {
      log.error('OpenAI chat error:', error)
      throw error
    }
  }

  /**
   * Streaming chat completion
   */
  async *chatStream(messages: Message[], options: ChatOptions = {}): AsyncGenerator<StreamChunk, void, unknown> {
    if (!this.client) throw new Error('OpenAI client not initialized')

    const {
      model = 'gpt-4-turbo-preview',
      temperature = 0.7,
      maxTokens = 2000,
      tools
    } = options

    const requestId = randomUUID()

    try {
      const params: OpenAI.Chat.ChatCompletionCreateParams = {
        model,
        messages: this.formatMessages(messages),
        temperature,
        max_tokens: maxTokens,
        stream: true
      }

      if (tools && tools.length > 0) {
        params.functions = tools.map(tool => ({
          name: tool.name,
          description: tool.description,
          parameters: tool.parameters as any
        }))
      }

      const stream = await this.client.chat.completions.create(params)

      let functionCall: { name: string; arguments: string } | undefined

      for await (const chunk of stream) {
        const choice = chunk.choices[0]

        if (choice?.delta?.function_call) {
          if (!functionCall) {
            functionCall = { name: choice.delta.function_call.name || '', arguments: '' }
          }
          if (choice.delta.function_call.arguments) {
            functionCall.arguments += choice.delta.function_call.arguments
          }
        }

        yield {
          id: requestId,
          delta: choice?.delta?.content || '',
          model: chunk.model,
          isComplete: choice?.finish_reason === 'stop',
          functionCall
        }
      }
    } catch (error) {
      log.error('OpenAI stream error:', error)
      throw error
    }
  }

  /**
   * Count tokens using tiktoken
   */
  override countTokens(text: string, model = 'gpt-4'): number {
    // For now, use approximation
    // TODO: Implement tiktoken for accurate counting
    return Math.ceil(text.length / 4)
  }
}
```

#### 1.4 VoltAgent Core Service

**File:** `lib/main/services/voltagent/voltagent.service.ts`

```typescript
import { BaseService } from '../base/service.base'
import { LLMProvider, ChatOptions, ChatResponse, Message, ToolDefinition } from './types/provider.types'
import { AgentEngine } from './core/agent.engine'
import { ContextManager } from './core/context.manager'
import { ToolRegistry } from './core/tool.registry'
import { TokenManager } from './core/token.manager'
import { StreamProcessor } from './core/stream.processor'
import { OpenAIProvider } from './providers/openai.provider'
import { MockProvider } from './providers/mock.provider'
import { serviceManager } from '../base/service.manager'
import { StorageService } from '../storage/storage.service'
import { DatabaseService } from '../database/database.service'
import PQueue from 'p-queue'
import log from 'electron-log/main'
import { EventEmitter } from 'eventemitter3'

export interface AgentConfig {
  name: string
  description: string
  instructions: string
  tools?: string[]
  model?: string
  temperature?: number
  maxSteps?: number
}

export interface AgentResult {
  id: string
  result: any
  steps: AgentStep[]
  usage: {
    totalTokens: number
    cost: number
  }
}

export interface AgentStep {
  action: string
  input: any
  output: any
  thinking?: string
  duration: number
}

export class VoltAgentService extends BaseService {
  private providers = new Map<string, LLMProvider>()
  private activeProvider: LLMProvider | null = null
  private agentEngine: AgentEngine
  private contextManager: ContextManager
  private toolRegistry: ToolRegistry
  private tokenManager: TokenManager
  private streamProcessor: StreamProcessor
  private queue: PQueue
  public events = new EventEmitter()

  constructor() {
    super({ name: 'voltagent' })

    // Initialize components
    this.agentEngine = new AgentEngine(this)
    this.contextManager = new ContextManager()
    this.toolRegistry = new ToolRegistry()
    this.tokenManager = new TokenManager()
    this.streamProcessor = new StreamProcessor()

    // Queue for rate limiting
    this.queue = new PQueue({
      concurrency: 3,
      interval: 1000,
      intervalCap: 10
    })
  }

  /**
   * Initialize VoltAgent service
   */
  protected async onInitialize(): Promise<void> {
    // Get storage service for credentials
    const storage = serviceManager.get<StorageService>('storage')

    // Initialize OpenAI provider
    const openaiKey = await storage.getCredential('openai', 'api_key')
    if (openaiKey) {
      const openaiProvider = new OpenAIProvider()
      await openaiProvider.initialize({ apiKey: openaiKey })
      this.registerProvider(openaiProvider)
      this.setActiveProvider('openai')
    }

    // Initialize mock provider for testing
    if (process.env.NODE_ENV === 'development') {
      const mockProvider = new MockProvider()
      await mockProvider.initialize({})
      this.registerProvider(mockProvider)
    }

    // Register built-in tools
    this.registerBuiltInTools()

    log.info('VoltAgent service initialized')
  }

  /**
   * Register a provider
   */
  registerProvider(provider: LLMProvider): void {
    this.providers.set(provider.name, provider)
    log.info(`Provider registered: ${provider.name}`)
  }

  /**
   * Set active provider
   */
  setActiveProvider(name: string): void {
    const provider = this.providers.get(name)
    if (!provider) {
      throw new Error(`Provider not found: ${name}`)
    }

    this.activeProvider = provider
    log.info(`Active provider set: ${name}`)
  }

  /**
   * Get active provider
   */
  getActiveProvider(): LLMProvider {
    if (!this.activeProvider) {
      throw new Error('No active provider set')
    }
    return this.activeProvider
  }

  /**
   * Register built-in tools
   */
  private registerBuiltInTools(): void {
    // Database query tool
    this.toolRegistry.register({
      name: 'query_database',
      description: 'Query the local SQLite database',
      parameters: z.object({
        query: z.string().describe('SQL query to execute')
      }),
      execute: async ({ query }) => {
        const db = serviceManager.get<DatabaseService>('database')
        return await db.prisma.$queryRawUnsafe(query)
      }
    })

    // Calculator tool
    this.toolRegistry.register({
      name: 'calculate',
      description: 'Perform mathematical calculations',
      parameters: z.object({
        expression: z.string().describe('Mathematical expression to evaluate')
      }),
      execute: async ({ expression }) => {
        try {
          // Safe math evaluation
          const result = Function('"use strict"; return (' + expression + ')')()
          return { result }
        } catch (error) {
          return { error: 'Invalid expression' }
        }
      }
    })

    // TODO: Add more built-in tools
  }

  /**
   * Chat completion
   */
  async chat(
    prompt: string,
    options: ChatOptions = {}
  ): Promise<ChatResponse> {
    const provider = this.getActiveProvider()

    // Create or get context
    const context = options.conversationId
      ? this.contextManager.getContext(options.conversationId)
      : this.contextManager.createContext()

    // Add user message to context
    context.addMessage({ role: 'user', content: prompt })

    // Add system prompt if provided
    if (options.systemPrompt) {
      context.setSystemPrompt(options.systemPrompt)
    }

    // Get messages with context window management
    const messages = context.getMessages()

    // Count tokens
    const promptTokens = this.tokenManager.countTokens(messages, provider)

    // Execute through queue
    const response = await this.queue.add(async () => {
      return await provider.chat(messages, options)
    }) as ChatResponse

    // Add assistant response to context
    context.addMessage({ role: 'assistant', content: response.content })

    // Track token usage
    if (response.usage) {
      this.tokenManager.trackUsage(response.usage)
    }

    // Emit event
    this.events.emit('chat:complete', {
      prompt,
      response,
      conversationId: context.id,
      usage: response.usage
    })

    // Save to database if user provided
    if (options.userId) {
      await this.saveConversation(
        options.userId,
        context.id,
        prompt,
        response.content,
        response.model
      )
    }

    return response
  }

  /**
   * Streaming chat completion
   */
  async *chatStream(
    prompt: string,
    options: ChatOptions = {}
  ): AsyncGenerator<StreamChunk, void, unknown> {
    const provider = this.getActiveProvider()

    // Create or get context
    const context = options.conversationId
      ? this.contextManager.getContext(options.conversationId)
      : this.contextManager.createContext()

    // Add user message
    context.addMessage({ role: 'user', content: prompt })

    // Get messages
    const messages = context.getMessages()

    // Stream from provider
    const stream = provider.chatStream(messages, options)

    // Process stream
    let fullContent = ''
    for await (const chunk of stream) {
      fullContent += chunk.delta

      // Emit chunk event
      this.events.emit('chat:stream:chunk', {
        conversationId: context.id,
        chunk
      })

      yield chunk
    }

    // Add complete response to context
    context.addMessage({ role: 'assistant', content: fullContent })

    // Save conversation
    if (options.userId) {
      await this.saveConversation(
        options.userId,
        context.id,
        prompt,
        fullContent,
        options.model || 'unknown'
      )
    }
  }

  /**
   * Run an agent
   */
  async runAgent(config: AgentConfig): Promise<AgentResult> {
    return await this.agentEngine.execute(config)
  }

  /**
   * Register a tool
   */
  registerTool(tool: ToolDefinition): void {
    this.toolRegistry.register(tool)
  }

  /**
   * Get registered tools
   */
  getTools(): ToolDefinition[] {
    return this.toolRegistry.getAll()
  }

  /**
   * Create a new context
   */
  createContext(options?: any): string {
    const context = this.contextManager.createContext(options)
    return context.id
  }

  /**
   * Get context
   */
  getContext(id: string) {
    return this.contextManager.getContext(id)
  }

  /**
   * Save conversation to database
   */
  private async saveConversation(
    userId: string,
    conversationId: string,
    prompt: string,
    response: string,
    model: string
  ): Promise<void> {
    const database = serviceManager.get<DatabaseService>('database')

    try {
      await database.prisma.conversation.upsert({
        where: { id: conversationId },
        create: {
          id: conversationId,
          userId,
          title: prompt.substring(0, 100),
          model,
          messages: {
            messages: [
              { role: 'user', content: prompt, timestamp: new Date() },
              { role: 'assistant', content: response, timestamp: new Date() }
            ]
          }
        },
        update: {
          messages: {
            push: [
              { role: 'user', content: prompt, timestamp: new Date() },
              { role: 'assistant', content: response, timestamp: new Date() }
            ]
          },
          updatedAt: new Date()
        }
      })
    } catch (error) {
      log.error('Failed to save conversation:', error)
    }
  }

  /**
   * Dispose service
   */
  protected async onDispose(): Promise<void> {
    // Dispose all providers
    for (const provider of this.providers.values()) {
      await provider.dispose()
    }

    this.providers.clear()
    this.activeProvider = null
    this.queue.clear()
  }
}

// Import dependencies
import { z } from 'zod'
```

#### 1.5 Context Manager

**File:** `lib/main/services/voltagent/core/context.manager.ts`

```typescript
import { Message } from '../types/provider.types'
import { randomUUID } from 'crypto'
import log from 'electron-log/main'

interface Context {
  id: string
  messages: Message[]
  systemPrompt?: string
  metadata: Record<string, any>
  createdAt: Date
  updatedAt: Date
  maxTokens: number
  tokenCount: number
}

export class ContextManager {
  private contexts = new Map<string, Context>()
  private maxContextSize = 8000 // Default max tokens

  /**
   * Create a new context
   */
  createContext(options: {
    systemPrompt?: string
    maxTokens?: number
    metadata?: Record<string, any>
  } = {}): Context {
    const context: Context = {
      id: randomUUID(),
      messages: [],
      systemPrompt: options.systemPrompt,
      metadata: options.metadata || {},
      createdAt: new Date(),
      updatedAt: new Date(),
      maxTokens: options.maxTokens || this.maxContextSize,
      tokenCount: 0
    }

    if (context.systemPrompt) {
      context.messages.push({
        role: 'system',
        content: context.systemPrompt
      })
    }

    this.contexts.set(context.id, context)
    log.debug(`Context created: ${context.id}`)

    return context
  }

  /**
   * Get context by ID
   */
  getContext(id: string): Context {
    const context = this.contexts.get(id)
    if (!context) {
      throw new Error(`Context not found: ${id}`)
    }
    return context
  }

  /**
   * Add message to context
   */
  addMessage(contextId: string, message: Message): void {
    const context = this.getContext(contextId)
    context.messages.push(message)
    context.updatedAt = new Date()

    // Update token count (approximate)
    context.tokenCount += Math.ceil(message.content.length / 4)

    // Trim context if needed
    this.trimContext(context)
  }

  /**
   * Trim context to fit token limit
   */
  private trimContext(context: Context): void {
    if (context.tokenCount <= context.maxTokens) return

    // Keep system prompt and recent messages
    const systemMessages = context.messages.filter(m => m.role === 'system')
    const otherMessages = context.messages.filter(m => m.role !== 'system')

    // Remove oldest messages until under limit
    while (context.tokenCount > context.maxTokens && otherMessages.length > 1) {
      const removed = otherMessages.shift()
      if (removed) {
        context.tokenCount -= Math.ceil(removed.content.length / 4)
      }
    }

    context.messages = [...systemMessages, ...otherMessages]
    log.debug(`Context trimmed: ${context.id}, messages: ${context.messages.length}`)
  }

  /**
   * Clear context
   */
  clearContext(id: string): void {
    const context = this.getContext(id)
    const systemMessages = context.messages.filter(m => m.role === 'system')
    context.messages = systemMessages
    context.tokenCount = systemMessages.reduce(
      (sum, msg) => sum + Math.ceil(msg.content.length / 4),
      0
    )
    context.updatedAt = new Date()
  }

  /**
   * Delete context
   */
  deleteContext(id: string): void {
    this.contexts.delete(id)
    log.debug(`Context deleted: ${id}`)
  }

  /**
   * Get all contexts
   */
  getAllContexts(): Context[] {
    return Array.from(this.contexts.values())
  }
}

// Extend Context with helper methods
declare module './context.manager' {
  interface Context {
    addMessage(message: Message): void
    getMessages(): Message[]
    setSystemPrompt(prompt: string): void
  }
}

// Add helper methods to Context
Object.defineProperty(Context.prototype, 'addMessage', {
  value: function(this: Context, message: Message) {
    this.messages.push(message)
    this.updatedAt = new Date()
    this.tokenCount += Math.ceil(message.content.length / 4)
  }
})

Object.defineProperty(Context.prototype, 'getMessages', {
  value: function(this: Context) {
    return this.messages
  }
})

Object.defineProperty(Context.prototype, 'setSystemPrompt', {
  value: function(this: Context, prompt: string) {
    // Remove old system prompt
    this.messages = this.messages.filter(m => m.role !== 'system')

    // Add new system prompt at beginning
    this.messages.unshift({
      role: 'system',
      content: prompt
    })

    this.systemPrompt = prompt
    this.updatedAt = new Date()
  }
})
```

#### 1.6 IPC Integration

**File:** `lib/conveyor/schemas/voltagent.schema.ts`

```typescript
import { z } from 'zod'

export const voltagentIpcSchema = {
  // Chat operations
  'voltagent:chat': {
    args: z.tuple([
      z.string(), // prompt
      z.object({
        model: z.string().optional(),
        temperature: z.number().optional(),
        maxTokens: z.number().optional(),
        systemPrompt: z.string().optional(),
        conversationId: z.string().optional(),
        userId: z.string().optional()
      }).optional()
    ]),
    return: z.object({
      id: z.string(),
      content: z.string(),
      model: z.string(),
      usage: z.object({
        promptTokens: z.number(),
        completionTokens: z.number(),
        totalTokens: z.number()
      }).optional()
    })
  },

  // Streaming chat
  'voltagent:chat-stream': {
    args: z.tuple([
      z.string(), // prompt
      z.object({
        model: z.string().optional(),
        temperature: z.number().optional(),
        maxTokens: z.number().optional(),
        systemPrompt: z.string().optional(),
        conversationId: z.string().optional(),
        userId: z.string().optional()
      }).optional()
    ]),
    return: z.string() // streamId
  },

  // Agent operations
  'voltagent:run-agent': {
    args: z.tuple([
      z.object({
        name: z.string(),
        description: z.string(),
        instructions: z.string(),
        tools: z.array(z.string()).optional(),
        model: z.string().optional(),
        temperature: z.number().optional(),
        maxSteps: z.number().optional()
      })
    ]),
    return: z.object({
      id: z.string(),
      result: z.any(),
      steps: z.array(z.object({
        action: z.string(),
        input: z.any(),
        output: z.any(),
        thinking: z.string().optional(),
        duration: z.number()
      })),
      usage: z.object({
        totalTokens: z.number(),
        cost: z.number()
      })
    })
  },

  // Tool operations
  'voltagent:register-tool': {
    args: z.tuple([
      z.object({
        name: z.string(),
        description: z.string(),
        parameters: z.any(), // Zod schema as JSON
        code: z.string() // Function code as string
      })
    ]),
    return: z.void()
  },

  'voltagent:get-tools': {
    args: z.tuple([]),
    return: z.array(z.object({
      name: z.string(),
      description: z.string()
    }))
  },

  // Context operations
  'voltagent:create-context': {
    args: z.tuple([
      z.object({
        systemPrompt: z.string().optional(),
        maxTokens: z.number().optional()
      }).optional()
    ]),
    return: z.string() // contextId
  },

  'voltagent:clear-context': {
    args: z.tuple([z.string()]), // contextId
    return: z.void()
  },

  // Provider operations
  'voltagent:set-provider': {
    args: z.tuple([z.string()]), // provider name
    return: z.void()
  },

  'voltagent:get-providers': {
    args: z.tuple([]),
    return: z.array(z.object({
      name: z.string(),
      capabilities: z.object({
        chat: z.boolean(),
        streaming: z.boolean(),
        functions: z.boolean(),
        vision: z.boolean(),
        embeddings: z.boolean(),
        maxTokens: z.number(),
        models: z.array(z.string())
      })
    }))
  }
} as const
```

**File:** `lib/conveyor/handlers/voltagent.handler.ts`

```typescript
import { handle } from '@/lib/main/shared'
import { serviceManager } from '@/lib/main/services/base/service.manager'
import { VoltAgentService } from '@/lib/main/services/voltagent/voltagent.service'
import { eventManager } from '@/lib/conveyor/events/event-manager'
import log from 'electron-log/main'

export function registerVoltAgentHandlers() {
  const voltagent = serviceManager.get<VoltAgentService>('voltagent')

  // Chat operations
  handle('voltagent:chat', async (prompt: string, options?: any) => {
    return await voltagent.chat(prompt, options)
  })

  handle('voltagent:chat-stream', async (prompt: string, options?: any) => {
    const streamId = `stream-${Date.now()}`

    // Start streaming in background
    (async () => {
      try {
        for await (const chunk of voltagent.chatStream(prompt, options)) {
          eventManager.emit('voltagent:stream-chunk', {
            streamId,
            chunk
          })
        }

        eventManager.emit('voltagent:stream-end', { streamId })
      } catch (error) {
        log.error('Stream error:', error)
        eventManager.emit('voltagent:stream-error', {
          streamId,
          error: error instanceof Error ? error.message : 'Unknown error'
        })
      }
    })()

    return streamId
  })

  // Agent operations
  handle('voltagent:run-agent', async (config: any) => {
    return await voltagent.runAgent(config)
  })

  // Tool operations
  handle('voltagent:register-tool', async (toolDef: any) => {
    // Parse the function code and create executable
    const execute = new Function('return ' + toolDef.code)()

    voltagent.registerTool({
      name: toolDef.name,
      description: toolDef.description,
      parameters: toolDef.parameters,
      execute
    })
  })

  handle('voltagent:get-tools', async () => {
    return voltagent.getTools().map(tool => ({
      name: tool.name,
      description: tool.description
    }))
  })

  // Context operations
  handle('voltagent:create-context', async (options?: any) => {
    return voltagent.createContext(options)
  })

  handle('voltagent:clear-context', async (id: string) => {
    const context = voltagent.getContext(id)
    if (context) {
      context.messages = context.messages.filter(m => m.role === 'system')
    }
  })

  // Provider operations
  handle('voltagent:set-provider', async (name: string) => {
    voltagent.setActiveProvider(name)
  })

  handle('voltagent:get-providers', async () => {
    // Return provider info
    const providers: any[] = []
    // TODO: Get actual providers from service
    return providers
  })
}
```

### Phase 2: React Integration

#### 2.1 VoltAgent Hook

**File:** `app/hooks/useVoltAgent.ts`

```typescript
import { useState, useCallback, useRef } from 'react'
import { useConveyor } from './useConveyor'
import { useConveyorEvent } from './useConveyorEvent'

interface ChatOptions {
  model?: string
  temperature?: number
  maxTokens?: number
  systemPrompt?: string
}

interface AgentConfig {
  name: string
  description: string
  instructions: string
  tools?: string[]
  model?: string
  maxSteps?: number
}

export function useVoltAgent() {
  const conveyor = useConveyor()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  const [conversationId, setConversationId] = useState<string | null>(null)
  const [streamContent, setStreamContent] = useState('')
  const streamIdRef = useRef<string | null>(null)

  // Chat completion
  const chat = useCallback(async (
    prompt: string,
    options?: ChatOptions
  ) => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await conveyor.voltagent.chat(prompt, {
        ...options,
        conversationId: conversationId || undefined
      })

      // Create conversation if first message
      if (!conversationId) {
        const newId = await conveyor.voltagent.createContext(options)
        setConversationId(newId)
      }

      return response
    } catch (err) {
      const error = err as Error
      setError(error)
      throw error
    } finally {
      setIsLoading(false)
    }
  }, [conveyor, conversationId])

  // Streaming chat
  const chatStream = useCallback(async (
    prompt: string,
    options?: ChatOptions
  ) => {
    setIsLoading(true)
    setError(null)
    setStreamContent('')

    try {
      const streamId = await conveyor.voltagent.chatStream(prompt, {
        ...options,
        conversationId: conversationId || undefined
      })

      streamIdRef.current = streamId

      // Create conversation if first message
      if (!conversationId) {
        const newId = await conveyor.voltagent.createContext(options)
        setConversationId(newId)
      }

      return streamId
    } catch (err) {
      const error = err as Error
      setError(error)
      throw error
    }
  }, [conveyor, conversationId])

  // Listen for stream chunks
  useConveyorEvent('voltagent:stream-chunk', (data) => {
    if (data.streamId === streamIdRef.current) {
      setStreamContent(prev => prev + data.chunk.delta)
    }
  })

  // Listen for stream end
  useConveyorEvent('voltagent:stream-end', (data) => {
    if (data.streamId === streamIdRef.current) {
      setIsLoading(false)
      streamIdRef.current = null
    }
  })

  // Listen for stream errors
  useConveyorEvent('voltagent:stream-error', (data) => {
    if (data.streamId === streamIdRef.current) {
      setError(new Error(data.error))
      setIsLoading(false)
      streamIdRef.current = null
    }
  })

  // Run agent
  const runAgent = useCallback(async (config: AgentConfig) => {
    setIsLoading(true)
    setError(null)

    try {
      const result = await conveyor.voltagent.runAgent(config)
      return result
    } catch (err) {
      const error = err as Error
      setError(error)
      throw error
    } finally {
      setIsLoading(false)
    }
  }, [conveyor])

  // Clear conversation
  const clearConversation = useCallback(async () => {
    if (conversationId) {
      await conveyor.voltagent.clearContext(conversationId)
      setStreamContent('')
    }
  }, [conveyor, conversationId])

  // Start new conversation
  const newConversation = useCallback(async (options?: ChatOptions) => {
    const newId = await conveyor.voltagent.createContext(options)
    setConversationId(newId)
    setStreamContent('')
    return newId
  }, [conveyor])

  return {
    // State
    isLoading,
    error,
    conversationId,
    streamContent,

    // Methods
    chat,
    chatStream,
    runAgent,
    clearConversation,
    newConversation
  }
}
```

---

## Testing Strategy

### Unit Tests

**File:** `tests/unit/services/voltagent.test.ts`

```typescript
import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest'
import { VoltAgentService } from '@/lib/main/services/voltagent/voltagent.service'
import { MockProvider } from '@/lib/main/services/voltagent/providers/mock.provider'

describe('VoltAgentService', () => {
  let service: VoltAgentService

  beforeAll(async () => {
    service = new VoltAgentService()

    // Use mock provider for testing
    const mockProvider = new MockProvider()
    await mockProvider.initialize({})
    service.registerProvider(mockProvider)
    service.setActiveProvider('mock')

    await service.initialize()
  })

  afterAll(async () => {
    await service.dispose()
  })

  it('should handle chat completion', async () => {
    const response = await service.chat('Hello, how are you?')

    expect(response.content).toBeDefined()
    expect(response.model).toBeDefined()
    expect(response.id).toBeDefined()
  })

  it('should handle streaming', async () => {
    const chunks: string[] = []

    for await (const chunk of service.chatStream('Tell me a story')) {
      chunks.push(chunk.delta)
    }

    expect(chunks.length).toBeGreaterThan(0)
    expect(chunks.join('')).toBeDefined()
  })

  it('should manage contexts', () => {
    const contextId = service.createContext({
      systemPrompt: 'You are a helpful assistant'
    })

    expect(contextId).toBeDefined()

    const context = service.getContext(contextId)
    expect(context.systemPrompt).toBe('You are a helpful assistant')
  })

  it('should register and execute tools', async () => {
    service.registerTool({
      name: 'test_tool',
      description: 'A test tool',
      parameters: z.object({
        input: z.string()
      }),
      execute: async ({ input }) => {
        return { output: input.toUpperCase() }
      }
    })

    const tools = service.getTools()
    expect(tools.find(t => t.name === 'test_tool')).toBeDefined()
  })
})
```

---

## Security Considerations

### 1. API Key Management
- ✅ Store provider API keys in secure storage
- ✅ Never expose keys to renderer process
- ✅ Rotate keys regularly
- ✅ Use environment-specific keys

### 2. Tool Execution Security
- ✅ Validate tool inputs with Zod
- ✅ Sandbox tool execution
- ✅ Limit resource usage
- ✅ Audit tool calls

### 3. Context Security
- ✅ Isolate user contexts
- ✅ Limit context size
- ✅ Sanitize messages
- ✅ Encrypt sensitive data

### 4. Rate Limiting
- ✅ Per-user rate limits
- ✅ Provider-level throttling
- ✅ Cost tracking and limits
- ✅ Graceful degradation

---

## Production Deployment

### 1. Provider Configuration
```typescript
// Production provider setup
const providers = {
  primary: 'openai',
  fallback: 'anthropic',
  rateLimit: {
    requests: 100,
    window: '1m'
  },
  costLimit: {
    daily: 100, // USD
    monthly: 1000
  }
}
```

### 2. Monitoring
- Token usage per user
- Cost tracking per provider
- Error rates and retries
- Performance metrics

### 3. Optimization
- Response caching
- Context compression
- Batch processing
- Provider selection

---

## Summary

This VoltAgent-first architecture provides:

✅ **Unified LLM Interface** - All LLM operations through VoltAgent
✅ **Provider Abstraction** - Easy to switch or combine providers
✅ **Agent Orchestration** - First-class support for agent workflows
✅ **Context Management** - Intelligent conversation handling
✅ **Tool System** - Extensible function calling
✅ **Type Safety** - Full TypeScript with runtime validation
✅ **Production Ready** - Error handling, monitoring, security

The architecture is lean but extensible, focusing on VoltAgent as the core orchestration layer while maintaining all the benefits from v2 (SQLite, Prisma, secure storage, etc.).