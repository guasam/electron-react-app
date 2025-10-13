# Implementation Plan v2: Simplified Offline-First Architecture

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

This document outlines a simplified, production-ready implementation plan for enhancing the Conveyor IPC system with:
- **Offline-first SQLite database** with Prisma ORM
- **Secure credential management** using Electron's native APIs
- **Type-safe end-to-end communication** with proper error handling
- **OpenAI integration** with streaming support
- **Optional cloud sync** to Postgres (future enhancement)
- **Background task processing** using native Worker Threads

### What's Changed from v1
- ✅ **SQLite instead of Postgres** - Local-first, works offline
- ✅ **Prisma ORM instead of raw SQL** - Type safety and migrations
- ✅ **Removed Inngest** - Use native Worker Threads instead
- ✅ **Removed VoltAgent** - Defer until actually needed
- ✅ **Secure credential storage** - No more plain .env files
- ✅ **Simplified service layer** - Proper lifecycle management
- ✅ **Better error handling** - Structured errors with recovery

### Goals
- 🎯 **Offline-first** - Full functionality without internet
- 🎯 **Type-safe** - From database to UI with no gaps
- 🎯 **Secure** - Encrypted credentials and validated IPC
- 🎯 **Simple** - Minimal abstractions, maximum clarity
- 🎯 **Testable** - Proper interfaces and dependency injection
- 🎯 **Production-ready** - Error handling, logging, monitoring

---

## Architecture

### Simplified Three-Layer Architecture

```
┌─────────────────────────────────────────────────┐
│           React UI (Renderer Process)           │
│                                                  │
│  ├── useConveyor() - Type-safe IPC calls        │
│  ├── useQuery() - Data fetching with cache      │
│  └── useSubscription() - Real-time updates      │
└─────────────────────────────────────────────────┘
                       ↕ IPC
┌─────────────────────────────────────────────────┐
│         Conveyor Layer (Type-Safe Bridge)       │
│                                                  │
│  ├── Schemas (Zod validation)                   │
│  ├── APIs (Client-side typed methods)           │
│  ├── Handlers (Server-side implementations)     │
│  └── Context (Request tracking & auth)          │
└─────────────────────────────────────────────────┘
                       ↕
┌─────────────────────────────────────────────────┐
│           Service Layer (Business Logic)        │
│                                                  │
│  ├── Database Service (Prisma + SQLite)         │
│  ├── OpenAI Service (Chat + Embeddings)         │
│  ├── Storage Service (Secure credentials)       │
│  ├── Worker Service (Background tasks)          │
│  └── Sync Service (Optional cloud sync)         │
└─────────────────────────────────────────────────┘
                       ↕
┌─────────────────────────────────────────────────┐
│              Data Layer (Storage)               │
│                                                  │
│  ├── SQLite Database (Local, encrypted)         │
│  ├── Secure Storage (Credentials)               │
│  └── File System (User data, cache)             │
└─────────────────────────────────────────────────┘
```

### Data Flow

#### Offline-First Query Pattern
```
User Action → React → Conveyor → Service → SQLite (immediate response)
                                    ↓
                              Queue for sync → Cloud (when online)
```

#### Real-time Updates Pattern
```
Database Change → Service → Event Bus → Conveyor → React (subscribed components)
```

---

## Core Principles

### 1. **Offline-First**
- SQLite as primary database (always available)
- Queue operations for cloud sync when offline
- Conflict resolution strategy for multi-device sync
- Local caching of API responses

### 2. **Security-First**
- Credentials encrypted with `safeStorage` API
- IPC validation and rate limiting
- SQL injection prevention via Prisma
- No secrets in code or config files

### 3. **Type-Safety Throughout**
- Prisma generates types from schema
- Zod validates at runtime
- TypeScript enforces at compile time
- No `any` types in public APIs

### 4. **Simple but Scalable**
- Start with essential features
- Clear extension points
- No premature optimization
- Document architectural decisions

### 5. **Developer Experience**
- Hot reload for UI changes
- Prisma Studio for database exploration
- Comprehensive error messages
- Auto-completion everywhere

---

## Technology Stack

### Core Dependencies
```json
{
  "dependencies": {
    "@prisma/client": "^5.x",      // ORM client
    "openai": "^4.x",               // OpenAI SDK
    "zod": "^3.x",                  // Runtime validation
    "better-sqlite3": "^9.x",       // SQLite driver
    "p-queue": "^7.x",              // Queue management
    "exponential-backoff": "^3.x",  // Retry logic
    "electron-log": "^5.x"          // Logging
  },
  "devDependencies": {
    "prisma": "^5.x",               // ORM CLI
    "vitest": "^1.x",               // Testing
    "@faker-js/faker": "^8.x",      // Test data
    "msw": "^2.x"                   // API mocking
  }
}
```

### Why These Choices?

- **Prisma + SQLite**: Type-safe ORM with local database
- **Zod**: Runtime validation that generates TypeScript types
- **p-queue**: Manage concurrent operations and offline queue
- **better-sqlite3**: Fastest SQLite driver for Node.js
- **exponential-backoff**: Standard retry pattern for APIs
- **Vitest**: Fast, ESM-first test runner

---

## Implementation Phases

### Phase 1: Foundation (Week 1)
**Goal:** Core infrastructure with proper patterns

1. **Service Architecture**
   - Service base class with lifecycle
   - Service manager for dependency injection
   - Request context for tracing
   - Structured error types

2. **Database Setup**
   - Prisma configuration for SQLite
   - Initial schema (users, settings, cache)
   - Migration strategy
   - Seed data for development

3. **Secure Storage**
   - Credential manager using safeStorage
   - Settings service for app config
   - Migration from .env to secure storage

4. **Enhanced Conveyor**
   - Request context propagation
   - Error boundary handling
   - Rate limiting per channel
   - Performance monitoring

### Phase 2: Core Services (Week 1-2)
**Goal:** Implement essential business logic

1. **Database Service**
   - Prisma client wrapper
   - Transaction support
   - Query optimization
   - Cache management

2. **OpenAI Service**
   - Secure API key storage
   - Chat completions with streaming
   - Embeddings for semantic search
   - Token counting and limits
   - Response caching

3. **Worker Service**
   - Background task queue
   - Worker thread pool
   - Progress reporting
   - Graceful shutdown

4. **Event System**
   - Type-safe event bus
   - Subscription management
   - Event replay for debugging
   - Performance metrics

### Phase 3: Integration (Week 2)
**Goal:** Wire services through Conveyor

1. **IPC Schemas**
   - User data operations
   - AI chat and embeddings
   - Settings management
   - Background tasks

2. **React Integration**
   - Custom hooks for data fetching
   - Optimistic updates
   - Cache invalidation
   - Real-time subscriptions

3. **Error Handling**
   - Global error boundary
   - Retry UI components
   - User-friendly error messages
   - Error reporting service

### Phase 4: Production Features (Week 3)
**Goal:** Production readiness

1. **Performance**
   - Database indexing
   - Query optimization
   - Memory management
   - Bundle size optimization

2. **Testing**
   - Unit tests for services
   - Integration tests for IPC
   - E2E tests with Playwright
   - Performance benchmarks

3. **Monitoring**
   - Application insights
   - Error tracking
   - Performance metrics
   - Usage analytics (privacy-respecting)

4. **Cloud Sync (Optional)**
   - Sync queue management
   - Conflict resolution
   - Multi-device support
   - Backup and restore

---

## File Structure

```
/Users/mac/dev/apo/apo-internal/
│
├── prisma/
│   ├── schema.prisma              # Database schema
│   ├── migrations/                # Migration history
│   └── seed.ts                    # Seed data
│
├── lib/
│   ├── conveyor/
│   │   ├── schemas/
│   │   │   ├── base.schema.ts    # Base schemas and types
│   │   │   ├── user.schema.ts    # User operations
│   │   │   ├── ai.schema.ts      # AI operations
│   │   │   └── index.ts          # Schema exports
│   │   │
│   │   ├── api/
│   │   │   ├── base.api.ts       # ConveyorApi base class
│   │   │   ├── user.api.ts       # User API
│   │   │   ├── ai.api.ts         # AI API
│   │   │   └── index.ts          # API exports
│   │   │
│   │   ├── handlers/
│   │   │   ├── base.handler.ts   # Handler utilities
│   │   │   ├── user.handler.ts   # User handlers
│   │   │   ├── ai.handler.ts     # AI handlers
│   │   │   └── index.ts          # Handler registration
│   │   │
│   │   ├── context/
│   │   │   ├── request.context.ts # Request context
│   │   │   └── auth.context.ts    # Authorization
│   │   │
│   │   └── errors/
│   │       ├── types.ts           # Error types
│   │       └── handler.ts         # Error handling
│   │
│   ├── main/
│   │   ├── services/
│   │   │   ├── base/
│   │   │   │   ├── service.base.ts      # Base service class
│   │   │   │   ├── service.manager.ts   # Service lifecycle
│   │   │   │   └── service.types.ts     # Service interfaces
│   │   │   │
│   │   │   ├── database/
│   │   │   │   ├── database.service.ts  # Prisma wrapper
│   │   │   │   ├── database.types.ts    # DB types
│   │   │   │   └── database.utils.ts    # DB utilities
│   │   │   │
│   │   │   ├── openai/
│   │   │   │   ├── openai.service.ts    # OpenAI client
│   │   │   │   ├── openai.types.ts      # AI types
│   │   │   │   └── openai.utils.ts      # Token counting
│   │   │   │
│   │   │   ├── storage/
│   │   │   │   ├── storage.service.ts   # Secure storage
│   │   │   │   └── storage.types.ts     # Storage types
│   │   │   │
│   │   │   ├── worker/
│   │   │   │   ├── worker.service.ts    # Worker threads
│   │   │   │   ├── worker.pool.ts       # Thread pool
│   │   │   │   └── tasks/               # Task definitions
│   │   │   │
│   │   │   └── events/
│   │   │       ├── event.bus.ts         # Event system
│   │   │       └── event.types.ts       # Event types
│   │   │
│   │   ├── config/
│   │   │   ├── app.config.ts            # App configuration
│   │   │   ├── database.config.ts       # DB configuration
│   │   │   └── paths.ts                 # File paths
│   │   │
│   │   ├── app.ts                       # Window creation
│   │   └── main.ts                      # Entry point
│   │
│   └── preload/
│       ├── preload.ts                   # Preload script
│       └── api.ts                       # API exposure
│
├── app/
│   ├── hooks/
│   │   ├── useQuery.ts                  # Data fetching
│   │   ├── useMutation.ts               # Data mutations
│   │   ├── useSubscription.ts           # Real-time updates
│   │   └── useConveyor.ts               # IPC wrapper
│   │
│   ├── providers/
│   │   ├── QueryProvider.tsx            # Query client
│   │   └── ConveyorProvider.tsx         # IPC context
│   │
│   └── utils/
│       ├── errors.ts                    # Error utilities
│       └── cache.ts                     # Cache helpers
│
├── tests/
│   ├── unit/                            # Unit tests
│   ├── integration/                     # Integration tests
│   ├── e2e/                             # E2E tests
│   └── fixtures/                        # Test data
│
├── .env.example                         # Example environment
├── vitest.config.ts                     # Test configuration
└── implementation-v2.md                 # This file
```

---

## Detailed Implementation

### Phase 1: Foundation

#### 1.1 Service Base Class

**File:** `lib/main/services/base/service.base.ts`

```typescript
import { EventEmitter } from 'events'
import log from 'electron-log/main'

export enum ServiceStatus {
  UNINITIALIZED = 'uninitialized',
  INITIALIZING = 'initializing',
  READY = 'ready',
  ERROR = 'error',
  DISPOSING = 'disposing',
  DISPOSED = 'disposed'
}

export interface ServiceConfig {
  name: string
  retryAttempts?: number
  retryDelay?: number
}

export abstract class BaseService extends EventEmitter {
  protected status: ServiceStatus = ServiceStatus.UNINITIALIZED
  protected config: ServiceConfig
  protected disposables: (() => Promise<void>)[] = []

  constructor(config: ServiceConfig) {
    super()
    this.config = config
  }

  /**
   * Initialize the service
   */
  async initialize(): Promise<void> {
    if (this.status !== ServiceStatus.UNINITIALIZED) {
      throw new Error(`Service ${this.config.name} already initialized`)
    }

    this.status = ServiceStatus.INITIALIZING
    log.info(`Initializing service: ${this.config.name}`)

    try {
      await this.onInitialize()
      this.status = ServiceStatus.READY
      this.emit('ready')
      log.info(`Service ready: ${this.config.name}`)
    } catch (error) {
      this.status = ServiceStatus.ERROR
      log.error(`Service initialization failed: ${this.config.name}`, error)
      throw error
    }
  }

  /**
   * Dispose of the service
   */
  async dispose(): Promise<void> {
    if (this.status === ServiceStatus.DISPOSED) {
      return
    }

    this.status = ServiceStatus.DISPOSING
    log.info(`Disposing service: ${this.config.name}`)

    try {
      // Run disposables in reverse order
      for (const dispose of this.disposables.reverse()) {
        await dispose()
      }

      await this.onDispose()
      this.status = ServiceStatus.DISPOSED
      this.emit('disposed')
      log.info(`Service disposed: ${this.config.name}`)
    } catch (error) {
      log.error(`Service disposal failed: ${this.config.name}`, error)
      throw error
    }
  }

  /**
   * Check if service is ready
   */
  isReady(): boolean {
    return this.status === ServiceStatus.READY
  }

  /**
   * Get service status
   */
  getStatus(): ServiceStatus {
    return this.status
  }

  /**
   * Wait for service to be ready
   */
  async waitForReady(timeout = 5000): Promise<void> {
    if (this.isReady()) return

    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error(`Service ${this.config.name} initialization timeout`))
      }, timeout)

      this.once('ready', () => {
        clearTimeout(timer)
        resolve()
      })
    })
  }

  /**
   * Register a disposable resource
   */
  protected registerDisposable(dispose: () => Promise<void>): void {
    this.disposables.push(dispose)
  }

  /**
   * Service-specific initialization
   */
  protected abstract onInitialize(): Promise<void>

  /**
   * Service-specific disposal
   */
  protected abstract onDispose(): Promise<void>
}
```

#### 1.2 Service Manager

**File:** `lib/main/services/base/service.manager.ts`

```typescript
import { BaseService } from './service.base'
import log from 'electron-log/main'

export class ServiceManager {
  private services = new Map<string, BaseService>()
  private initOrder: string[] = []

  /**
   * Register a service
   */
  register(name: string, service: BaseService): void {
    if (this.services.has(name)) {
      throw new Error(`Service already registered: ${name}`)
    }

    this.services.set(name, service)
    this.initOrder.push(name)
    log.debug(`Service registered: ${name}`)
  }

  /**
   * Get a service by name
   */
  get<T extends BaseService>(name: string): T {
    const service = this.services.get(name)
    if (!service) {
      throw new Error(`Service not found: ${name}`)
    }
    return service as T
  }

  /**
   * Check if a service exists
   */
  has(name: string): boolean {
    return this.services.has(name)
  }

  /**
   * Initialize all services in order
   */
  async initializeAll(): Promise<void> {
    log.info('Initializing all services...')

    for (const name of this.initOrder) {
      const service = this.services.get(name)!
      try {
        await service.initialize()
      } catch (error) {
        log.error(`Failed to initialize service: ${name}`, error)
        // Dispose already initialized services
        await this.disposeAll()
        throw error
      }
    }

    log.info('All services initialized successfully')
  }

  /**
   * Dispose all services in reverse order
   */
  async disposeAll(): Promise<void> {
    log.info('Disposing all services...')

    // Dispose in reverse order
    for (const name of [...this.initOrder].reverse()) {
      const service = this.services.get(name)!
      try {
        await service.dispose()
      } catch (error) {
        log.error(`Failed to dispose service: ${name}`, error)
      }
    }

    log.info('All services disposed')
  }

  /**
   * Get all service statuses
   */
  getStatuses(): Record<string, string> {
    const statuses: Record<string, string> = {}
    for (const [name, service] of this.services) {
      statuses[name] = service.getStatus()
    }
    return statuses
  }

  /**
   * Wait for all services to be ready
   */
  async waitForAll(timeout = 10000): Promise<void> {
    const promises = Array.from(this.services.values()).map(service =>
      service.waitForReady(timeout)
    )
    await Promise.all(promises)
  }
}

// Export singleton instance
export const serviceManager = new ServiceManager()
```

#### 1.3 Database Configuration

**File:** `prisma/schema.prisma`

```prisma
// Prisma schema for SQLite database

generator client {
  provider = "prisma-client-js"
  output   = "../node_modules/.prisma/client"
}

datasource db {
  provider = "sqlite"
  url      = "file:./app.db"
}

// User settings and preferences
model User {
  id        String   @id @default(cuid())
  email     String?  @unique
  name      String?
  settings  Json     @default("{}")
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  // Relations
  conversations Conversation[]
  documents     Document[]
  tasks         Task[]
}

// AI conversation history
model Conversation {
  id        String   @id @default(cuid())
  userId    String
  title     String
  model     String
  messages  Json     // Array of messages
  metadata  Json     @default("{}")
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  // Relations
  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId, updatedAt])
}

// Document storage with embeddings
model Document {
  id         String   @id @default(cuid())
  userId     String
  title      String
  content    String
  embedding  Bytes?   // Vector embedding
  metadata   Json     @default("{}")
  createdAt  DateTime @default(now())
  updatedAt  DateTime @updatedAt

  // Relations
  user User @relation(fields: [userId], references: [id], onDelete: Cascade)
  chunks DocumentChunk[]

  @@index([userId, updatedAt])
}

// Document chunks for large documents
model DocumentChunk {
  id         String   @id @default(cuid())
  documentId String
  content    String
  embedding  Bytes?   // Vector embedding
  position   Int
  metadata   Json     @default("{}")
  createdAt  DateTime @default(now())

  // Relations
  document Document @relation(fields: [documentId], references: [id], onDelete: Cascade)

  @@index([documentId, position])
}

// Background tasks
model Task {
  id         String   @id @default(cuid())
  userId     String
  type       String
  status     String   @default("pending") // pending, running, completed, failed
  input      Json
  output     Json?
  error      String?
  progress   Int      @default(0)
  startedAt  DateTime?
  completedAt DateTime?
  createdAt  DateTime @default(now())
  updatedAt  DateTime @updatedAt

  // Relations
  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId, status, createdAt])
  @@index([type, status])
}

// Application cache
model Cache {
  key       String   @id
  value     Json
  expiresAt DateTime?
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@index([expiresAt])
}

// Sync queue for cloud operations
model SyncQueue {
  id        String   @id @default(cuid())
  operation String   // create, update, delete
  entity    String   // conversation, document, etc.
  entityId  String
  data      Json
  attempts  Int      @default(0)
  error     String?
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@index([entity, entityId])
  @@index([createdAt])
}

// Application settings
model Setting {
  key       String   @id
  value     Json
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}
```

#### 1.4 Database Service

**File:** `lib/main/services/database/database.service.ts`

```typescript
import { PrismaClient } from '@prisma/client'
import { BaseService } from '../base/service.base'
import { app } from 'electron'
import path from 'path'
import fs from 'fs/promises'
import log from 'electron-log/main'

export class DatabaseService extends BaseService {
  private client: PrismaClient | null = null
  private dbPath: string

  constructor() {
    super({ name: 'database' })

    // Store database in app data directory
    const userData = app.getPath('userData')
    this.dbPath = path.join(userData, 'database', 'app.db')
  }

  /**
   * Get Prisma client
   */
  get prisma(): PrismaClient {
    if (!this.client) {
      throw new Error('Database not initialized')
    }
    return this.client
  }

  /**
   * Initialize database
   */
  protected async onInitialize(): Promise<void> {
    // Ensure database directory exists
    const dbDir = path.dirname(this.dbPath)
    await fs.mkdir(dbDir, { recursive: true })

    // Update DATABASE_URL for Prisma
    process.env.DATABASE_URL = `file:${this.dbPath}`

    // Initialize Prisma client
    this.client = new PrismaClient({
      log: [
        { level: 'query', emit: 'event' },
        { level: 'error', emit: 'event' },
        { level: 'warn', emit: 'event' }
      ],
      errorFormat: 'pretty'
    })

    // Setup logging
    this.client.$on('query' as any, (e: any) => {
      log.debug('Database query:', e.query, e.params)
    })

    this.client.$on('error' as any, (e: any) => {
      log.error('Database error:', e)
    })

    this.client.$on('warn' as any, (e: any) => {
      log.warn('Database warning:', e)
    })

    // Connect to database
    await this.client.$connect()

    // Run migrations if needed
    await this.runMigrations()

    // Clean expired cache entries
    await this.cleanExpiredCache()

    log.info(`Database initialized at: ${this.dbPath}`)
  }

  /**
   * Run database migrations
   */
  private async runMigrations(): Promise<void> {
    try {
      // In production, migrations are handled differently
      // For development, we can use Prisma migrate
      if (process.env.NODE_ENV === 'development') {
        const { execSync } = require('child_process')
        execSync('npx prisma migrate deploy', { stdio: 'inherit' })
      }
    } catch (error) {
      log.error('Migration failed:', error)
      throw error
    }
  }

  /**
   * Clean expired cache entries
   */
  private async cleanExpiredCache(): Promise<void> {
    try {
      await this.client!.cache.deleteMany({
        where: {
          expiresAt: {
            lte: new Date()
          }
        }
      })
    } catch (error) {
      log.warn('Failed to clean cache:', error)
    }
  }

  /**
   * Dispose database connection
   */
  protected async onDispose(): Promise<void> {
    if (this.client) {
      await this.client.$disconnect()
      this.client = null
    }
  }

  /**
   * Transaction helper
   */
  async transaction<T>(
    fn: (prisma: PrismaClient) => Promise<T>
  ): Promise<T> {
    return await this.prisma.$transaction(async (tx) => {
      return await fn(tx as PrismaClient)
    })
  }

  /**
   * Cache helper
   */
  async cached<T>(
    key: string,
    fn: () => Promise<T>,
    ttl?: number
  ): Promise<T> {
    // Check cache
    const cached = await this.prisma.cache.findUnique({
      where: { key }
    })

    if (cached && (!cached.expiresAt || cached.expiresAt > new Date())) {
      return cached.value as T
    }

    // Compute value
    const value = await fn()

    // Store in cache
    await this.prisma.cache.upsert({
      where: { key },
      create: {
        key,
        value: value as any,
        expiresAt: ttl ? new Date(Date.now() + ttl) : null
      },
      update: {
        value: value as any,
        expiresAt: ttl ? new Date(Date.now() + ttl) : null
      }
    })

    return value
  }

  /**
   * Get database stats
   */
  async getStats() {
    const [
      userCount,
      conversationCount,
      documentCount,
      taskCount,
      cacheSize
    ] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.conversation.count(),
      this.prisma.document.count(),
      this.prisma.task.count(),
      this.prisma.cache.count()
    ])

    return {
      users: userCount,
      conversations: conversationCount,
      documents: documentCount,
      tasks: taskCount,
      cacheEntries: cacheSize,
      dbPath: this.dbPath
    }
  }
}
```

#### 1.5 Storage Service (Secure Credentials)

**File:** `lib/main/services/storage/storage.service.ts`

```typescript
import { BaseService } from '../base/service.base'
import { safeStorage, app } from 'electron'
import path from 'path'
import fs from 'fs/promises'
import log from 'electron-log/main'

interface StoredCredential {
  service: string
  account: string
  encryptedData: Buffer
}

export class StorageService extends BaseService {
  private credentialsPath: string
  private credentials: Map<string, string> = new Map()

  constructor() {
    super({ name: 'storage' })

    const userData = app.getPath('userData')
    this.credentialsPath = path.join(userData, 'credentials.json')
  }

  /**
   * Initialize storage
   */
  protected async onInitialize(): Promise<void> {
    // Load existing credentials
    await this.loadCredentials()

    // Check if encryption is available
    if (!safeStorage.isEncryptionAvailable()) {
      log.warn('Encryption not available, credentials will be stored in plain text')
    }
  }

  /**
   * Load credentials from disk
   */
  private async loadCredentials(): Promise<void> {
    try {
      const data = await fs.readFile(this.credentialsPath, 'utf-8')
      const stored: StoredCredential[] = JSON.parse(data)

      for (const cred of stored) {
        const key = `${cred.service}:${cred.account}`
        const decrypted = safeStorage.decryptString(Buffer.from(cred.encryptedData))
        this.credentials.set(key, decrypted)
      }

      log.info(`Loaded ${stored.length} credentials`)
    } catch (error: any) {
      if (error.code !== 'ENOENT') {
        log.error('Failed to load credentials:', error)
      }
    }
  }

  /**
   * Save credentials to disk
   */
  private async saveCredentials(): Promise<void> {
    const stored: StoredCredential[] = []

    for (const [key, value] of this.credentials) {
      const [service, account] = key.split(':')
      stored.push({
        service,
        account,
        encryptedData: safeStorage.encryptString(value) as any
      })
    }

    await fs.writeFile(
      this.credentialsPath,
      JSON.stringify(stored, null, 2)
    )
  }

  /**
   * Store a credential
   */
  async setCredential(service: string, account: string, password: string): Promise<void> {
    const key = `${service}:${account}`
    this.credentials.set(key, password)
    await this.saveCredentials()
    log.debug(`Credential stored: ${service}/${account}`)
  }

  /**
   * Get a credential
   */
  async getCredential(service: string, account: string): Promise<string | null> {
    const key = `${service}:${account}`
    return this.credentials.get(key) || null
  }

  /**
   * Delete a credential
   */
  async deleteCredential(service: string, account: string): Promise<void> {
    const key = `${service}:${account}`
    this.credentials.delete(key)
    await this.saveCredentials()
    log.debug(`Credential deleted: ${service}/${account}`)
  }

  /**
   * Check if credential exists
   */
  hasCredential(service: string, account: string): boolean {
    const key = `${service}:${account}`
    return this.credentials.has(key)
  }

  /**
   * Get all credential keys (not values)
   */
  getCredentialKeys(): string[] {
    return Array.from(this.credentials.keys())
  }

  /**
   * Store application setting
   */
  async setSetting(key: string, value: any): Promise<void> {
    const { prisma } = serviceManager.get<DatabaseService>('database')

    await prisma.setting.upsert({
      where: { key },
      create: { key, value },
      update: { value }
    })
  }

  /**
   * Get application setting
   */
  async getSetting<T = any>(key: string, defaultValue?: T): Promise<T | null> {
    const { prisma } = serviceManager.get<DatabaseService>('database')

    const setting = await prisma.setting.findUnique({
      where: { key }
    })

    return setting ? setting.value as T : (defaultValue ?? null)
  }

  /**
   * Delete application setting
   */
  async deleteSetting(key: string): Promise<void> {
    const { prisma } = serviceManager.get<DatabaseService>('database')

    await prisma.setting.delete({
      where: { key }
    }).catch(() => {})
  }

  /**
   * Dispose service
   */
  protected async onDispose(): Promise<void> {
    // Clear sensitive data from memory
    this.credentials.clear()
  }
}

// Import service manager
import { serviceManager } from '../base/service.manager'
import { DatabaseService } from '../database/database.service'
```

#### 1.6 Structured Error Types

**File:** `lib/conveyor/errors/types.ts`

```typescript
/**
 * Base error class for all Conveyor errors
 */
export class ConveyorError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly statusCode: number = 500,
    public readonly details?: unknown,
    public readonly retry: boolean = false
  ) {
    super(message)
    this.name = 'ConveyorError'
    Error.captureStackTrace(this, this.constructor)
  }

  toJSON() {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      statusCode: this.statusCode,
      details: this.details,
      retry: this.retry,
      stack: this.stack
    }
  }
}

/**
 * Validation error for invalid input
 */
export class ValidationError extends ConveyorError {
  constructor(message: string, details?: unknown) {
    super(message, 'VALIDATION_ERROR', 400, details, false)
    this.name = 'ValidationError'
  }
}

/**
 * Authentication error
 */
export class AuthenticationError extends ConveyorError {
  constructor(message: string = 'Authentication required') {
    super(message, 'AUTHENTICATION_ERROR', 401, undefined, false)
    this.name = 'AuthenticationError'
  }
}

/**
 * Authorization error
 */
export class AuthorizationError extends ConveyorError {
  constructor(message: string = 'Permission denied') {
    super(message, 'AUTHORIZATION_ERROR', 403, undefined, false)
    this.name = 'AuthorizationError'
  }
}

/**
 * Not found error
 */
export class NotFoundError extends ConveyorError {
  constructor(resource: string, id?: string) {
    const message = id ? `${resource} with id ${id} not found` : `${resource} not found`
    super(message, 'NOT_FOUND', 404, { resource, id }, false)
    this.name = 'NotFoundError'
  }
}

/**
 * Database error
 */
export class DatabaseError extends ConveyorError {
  constructor(message: string, details?: unknown) {
    super(message, 'DATABASE_ERROR', 500, details, true)
    this.name = 'DatabaseError'
  }
}

/**
 * External API error
 */
export class ExternalApiError extends ConveyorError {
  constructor(service: string, message: string, details?: unknown) {
    super(`${service} API error: ${message}`, 'EXTERNAL_API_ERROR', 502, details, true)
    this.name = 'ExternalApiError'
  }
}

/**
 * Rate limit error
 */
export class RateLimitError extends ConveyorError {
  constructor(limit: number, window: string, retryAfter?: number) {
    const message = `Rate limit exceeded: ${limit} requests per ${window}`
    super(message, 'RATE_LIMIT_ERROR', 429, { limit, window, retryAfter }, true)
    this.name = 'RateLimitError'
  }
}

/**
 * Service unavailable error
 */
export class ServiceUnavailableError extends ConveyorError {
  constructor(service: string) {
    super(`Service unavailable: ${service}`, 'SERVICE_UNAVAILABLE', 503, { service }, true)
    this.name = 'ServiceUnavailableError'
  }
}

/**
 * Type guard for ConveyorError
 */
export function isConveyorError(error: unknown): error is ConveyorError {
  return error instanceof ConveyorError
}

/**
 * Serialize error for IPC transport
 */
export function serializeError(error: unknown): object {
  if (isConveyorError(error)) {
    return error.toJSON()
  }

  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
      stack: error.stack
    }
  }

  return {
    name: 'UnknownError',
    message: String(error)
  }
}

/**
 * Deserialize error from IPC transport
 */
export function deserializeError(data: any): Error {
  if (data.code) {
    return new ConveyorError(
      data.message,
      data.code,
      data.statusCode,
      data.details,
      data.retry
    )
  }

  const error = new Error(data.message)
  error.name = data.name
  error.stack = data.stack
  return error
}
```

### Phase 2: Core Services

#### 2.1 OpenAI Service with Secure Storage

**File:** `lib/main/services/openai/openai.service.ts`

```typescript
import { BaseService } from '../base/service.base'
import { StorageService } from '../storage/storage.service'
import { DatabaseService } from '../database/database.service'
import { serviceManager } from '../base/service.manager'
import { ExternalApiError, RateLimitError } from '@/lib/conveyor/errors/types'
import OpenAI from 'openai'
import { backOff } from 'exponential-backoff'
import PQueue from 'p-queue'
import log from 'electron-log/main'
import { randomUUID } from 'crypto'

interface StreamHandlers {
  onStart?: (requestId: string) => void
  onChunk?: (chunk: string, index: number) => void
  onEnd?: (requestId: string, usage?: any) => void
  onError?: (error: Error) => void
}

export class OpenAIService extends BaseService {
  private client: OpenAI | null = null
  private queue: PQueue
  private activeStreams = new Map<string, AbortController>()

  constructor() {
    super({ name: 'openai' })

    // Rate limiting queue
    this.queue = new PQueue({
      concurrency: 3,
      interval: 1000,
      intervalCap: 10
    })
  }

  /**
   * Initialize OpenAI service
   */
  protected async onInitialize(): Promise<void> {
    const storage = serviceManager.get<StorageService>('storage')

    // Get API key from secure storage
    const apiKey = await storage.getCredential('openai', 'api_key')

    if (!apiKey) {
      log.warn('OpenAI API key not configured')
      return
    }

    this.client = new OpenAI({
      apiKey,
      maxRetries: 3
    })

    // Test connection
    try {
      await this.testConnection()
      log.info('OpenAI service initialized')
    } catch (error) {
      log.error('OpenAI connection test failed:', error)
      throw error
    }
  }

  /**
   * Test OpenAI connection
   */
  private async testConnection(): Promise<void> {
    if (!this.client) return

    await this.client.models.list()
  }

  /**
   * Ensure client is available
   */
  private ensureClient(): OpenAI {
    if (!this.client) {
      throw new ExternalApiError('OpenAI', 'Service not configured')
    }
    return this.client
  }

  /**
   * Chat completion
   */
  async chat(
    prompt: string,
    options: {
      model?: string
      temperature?: number
      maxTokens?: number
      userId?: string
      conversationId?: string
    } = {}
  ): Promise<string> {
    const client = this.ensureClient()
    const {
      model = 'gpt-4-turbo-preview',
      temperature = 0.7,
      maxTokens = 2000,
      userId,
      conversationId
    } = options

    return await this.queue.add(async () => {
      try {
        const response = await backOff(
          async () => {
            const result = await client.chat.completions.create({
              model,
              messages: [{ role: 'user', content: prompt }],
              temperature,
              max_tokens: maxTokens
            })
            return result
          },
          {
            numOfAttempts: 3,
            startingDelay: 1000,
            retry: (error: any) => {
              if (error?.status === 429) {
                throw new RateLimitError(10, 'minute', error?.headers?.['retry-after'])
              }
              return error?.status >= 500
            }
          }
        )

        const content = response.choices[0]?.message?.content || ''

        // Save to database if user context provided
        if (userId) {
          await this.saveConversation(userId, conversationId, prompt, content, model)
        }

        return content
      } catch (error: any) {
        log.error('OpenAI chat error:', error)
        throw new ExternalApiError('OpenAI', error.message, error)
      }
    }) as string
  }

  /**
   * Stream chat completion
   */
  async chatStream(
    prompt: string,
    handlers: StreamHandlers,
    options: {
      model?: string
      temperature?: number
      maxTokens?: number
      userId?: string
      conversationId?: string
    } = {}
  ): Promise<string> {
    const client = this.ensureClient()
    const requestId = randomUUID()
    const abortController = new AbortController()

    const {
      model = 'gpt-4-turbo-preview',
      temperature = 0.7,
      maxTokens = 2000,
      userId,
      conversationId
    } = options

    // Store abort controller
    this.activeStreams.set(requestId, abortController)

    try {
      handlers.onStart?.(requestId)

      const stream = await client.chat.completions.create({
        model,
        messages: [{ role: 'user', content: prompt }],
        temperature,
        max_tokens: maxTokens,
        stream: true,
        signal: abortController.signal as any
      })

      let fullContent = ''
      let index = 0

      for await (const chunk of stream) {
        const content = chunk.choices[0]?.delta?.content || ''
        if (content) {
          fullContent += content
          handlers.onChunk?.(content, index++)
        }
      }

      handlers.onEnd?.(requestId)

      // Save to database if user context provided
      if (userId) {
        await this.saveConversation(userId, conversationId, prompt, fullContent, model)
      }

      return requestId
    } catch (error: any) {
      log.error('OpenAI stream error:', error)
      handlers.onError?.(error)
      throw new ExternalApiError('OpenAI', error.message, error)
    } finally {
      this.activeStreams.delete(requestId)
    }
  }

  /**
   * Cancel a stream
   */
  cancelStream(requestId: string): void {
    const controller = this.activeStreams.get(requestId)
    if (controller) {
      controller.abort()
      this.activeStreams.delete(requestId)
      log.debug(`Stream cancelled: ${requestId}`)
    }
  }

  /**
   * Create embeddings
   */
  async createEmbedding(
    text: string,
    options: {
      model?: string
    } = {}
  ): Promise<number[]> {
    const client = this.ensureClient()
    const { model = 'text-embedding-3-small' } = options

    return await this.queue.add(async () => {
      try {
        const response = await backOff(
          async () => {
            const result = await client.embeddings.create({
              model,
              input: text
            })
            return result
          },
          {
            numOfAttempts: 3,
            startingDelay: 1000
          }
        )

        return response.data[0].embedding
      } catch (error: any) {
        log.error('OpenAI embedding error:', error)
        throw new ExternalApiError('OpenAI', error.message, error)
      }
    }) as number[]
  }

  /**
   * Save conversation to database
   */
  private async saveConversation(
    userId: string,
    conversationId: string | undefined,
    prompt: string,
    response: string,
    model: string
  ): Promise<void> {
    const database = serviceManager.get<DatabaseService>('database')

    try {
      if (conversationId) {
        // Update existing conversation
        await database.prisma.conversation.update({
          where: { id: conversationId },
          data: {
            messages: {
              push: [
                { role: 'user', content: prompt, timestamp: new Date() },
                { role: 'assistant', content: response, timestamp: new Date() }
              ]
            },
            updatedAt: new Date()
          }
        })
      } else {
        // Create new conversation
        await database.prisma.conversation.create({
          data: {
            userId,
            title: prompt.substring(0, 100),
            model,
            messages: [
              { role: 'user', content: prompt, timestamp: new Date() },
              { role: 'assistant', content: response, timestamp: new Date() }
            ]
          }
        })
      }
    } catch (error) {
      log.error('Failed to save conversation:', error)
    }
  }

  /**
   * Count tokens (approximate)
   */
  countTokens(text: string): number {
    // Rough approximation: 1 token ≈ 4 characters
    return Math.ceil(text.length / 4)
  }

  /**
   * Dispose service
   */
  protected async onDispose(): Promise<void> {
    // Cancel all active streams
    for (const [requestId, controller] of this.activeStreams) {
      controller.abort()
      log.debug(`Aborting stream on dispose: ${requestId}`)
    }
    this.activeStreams.clear()

    // Clear queue
    this.queue.clear()

    this.client = null
  }
}
```

#### 2.2 Worker Service

**File:** `lib/main/services/worker/worker.service.ts`

```typescript
import { BaseService } from '../base/service.base'
import { Worker } from 'worker_threads'
import { EventEmitter } from 'events'
import PQueue from 'p-queue'
import path from 'path'
import log from 'electron-log/main'

interface WorkerTask {
  id: string
  type: string
  data: any
  onProgress?: (progress: number) => void
  onComplete?: (result: any) => void
  onError?: (error: Error) => void
}

export class WorkerService extends BaseService {
  private workers: Worker[] = []
  private queue: PQueue
  private taskEmitter = new EventEmitter()
  private workerPool: Worker[] = []
  private availableWorkers: Worker[] = []

  constructor() {
    super({ name: 'worker' })

    this.queue = new PQueue({
      concurrency: 2
    })
  }

  /**
   * Initialize worker service
   */
  protected async onInitialize(): Promise<void> {
    // Create worker pool
    const workerCount = 2

    for (let i = 0; i < workerCount; i++) {
      const worker = new Worker(
        path.join(__dirname, 'worker.thread.js'),
        {
          workerData: { id: i }
        }
      )

      worker.on('message', this.handleWorkerMessage.bind(this))
      worker.on('error', this.handleWorkerError.bind(this))
      worker.on('exit', this.handleWorkerExit.bind(this))

      this.workers.push(worker)
      this.availableWorkers.push(worker)
    }

    log.info(`Worker service initialized with ${workerCount} workers`)
  }

  /**
   * Execute task in worker
   */
  async executeTask<T = any>(
    type: string,
    data: any,
    options: {
      onProgress?: (progress: number) => void
      timeout?: number
    } = {}
  ): Promise<T> {
    const taskId = `${type}-${Date.now()}-${Math.random()}`

    return new Promise((resolve, reject) => {
      const task: WorkerTask = {
        id: taskId,
        type,
        data,
        onProgress: options.onProgress,
        onComplete: resolve,
        onError: reject
      }

      this.queue.add(async () => {
        const worker = await this.getAvailableWorker()

        try {
          // Set timeout if specified
          let timeoutId: NodeJS.Timeout | undefined
          if (options.timeout) {
            timeoutId = setTimeout(() => {
              this.releaseWorker(worker)
              reject(new Error(`Task timeout: ${taskId}`))
            }, options.timeout)
          }

          // Setup listeners
          const messageHandler = (message: any) => {
            if (message.taskId !== taskId) return

            if (message.type === 'progress') {
              task.onProgress?.(message.progress)
            } else if (message.type === 'complete') {
              if (timeoutId) clearTimeout(timeoutId)
              worker.off('message', messageHandler)
              this.releaseWorker(worker)
              task.onComplete?.(message.result)
            } else if (message.type === 'error') {
              if (timeoutId) clearTimeout(timeoutId)
              worker.off('message', messageHandler)
              this.releaseWorker(worker)
              task.onError?.(new Error(message.error))
            }
          }

          worker.on('message', messageHandler)

          // Send task to worker
          worker.postMessage({
            taskId,
            type,
            data
          })
        } catch (error) {
          this.releaseWorker(worker)
          throw error
        }
      })
    })
  }

  /**
   * Get available worker
   */
  private async getAvailableWorker(): Promise<Worker> {
    return new Promise((resolve) => {
      const checkWorker = () => {
        if (this.availableWorkers.length > 0) {
          resolve(this.availableWorkers.shift()!)
        } else {
          setTimeout(checkWorker, 100)
        }
      }
      checkWorker()
    })
  }

  /**
   * Release worker back to pool
   */
  private releaseWorker(worker: Worker): void {
    if (!this.availableWorkers.includes(worker)) {
      this.availableWorkers.push(worker)
    }
  }

  /**
   * Handle worker message
   */
  private handleWorkerMessage(message: any): void {
    log.debug('Worker message:', message)
  }

  /**
   * Handle worker error
   */
  private handleWorkerError(error: Error): void {
    log.error('Worker error:', error)
  }

  /**
   * Handle worker exit
   */
  private handleWorkerExit(code: number): void {
    if (code !== 0) {
      log.error(`Worker exited with code: ${code}`)
    }
  }

  /**
   * Dispose service
   */
  protected async onDispose(): Promise<void> {
    // Clear queue
    this.queue.clear()

    // Terminate all workers
    for (const worker of this.workers) {
      await worker.terminate()
    }

    this.workers = []
    this.availableWorkers = []
  }
}
```

**File:** `lib/main/services/worker/worker.thread.js`

```javascript
const { parentPort, workerData } = require('worker_threads')

// Handle messages from main thread
parentPort.on('message', async (message) => {
  const { taskId, type, data } = message

  try {
    // Report progress
    const reportProgress = (progress) => {
      parentPort.postMessage({
        taskId,
        type: 'progress',
        progress
      })
    }

    // Execute task based on type
    let result

    switch (type) {
      case 'heavy-computation':
        result = await performHeavyComputation(data, reportProgress)
        break

      case 'data-processing':
        result = await processData(data, reportProgress)
        break

      case 'file-operation':
        result = await performFileOperation(data, reportProgress)
        break

      default:
        throw new Error(`Unknown task type: ${type}`)
    }

    // Send result
    parentPort.postMessage({
      taskId,
      type: 'complete',
      result
    })
  } catch (error) {
    // Send error
    parentPort.postMessage({
      taskId,
      type: 'error',
      error: error.message
    })
  }
})

// Example task implementations
async function performHeavyComputation(data, reportProgress) {
  // Simulate heavy computation
  const iterations = data.iterations || 1000000
  let result = 0

  for (let i = 0; i < iterations; i++) {
    result += Math.sqrt(i)

    // Report progress every 10%
    if (i % (iterations / 10) === 0) {
      reportProgress((i / iterations) * 100)
    }
  }

  return result
}

async function processData(data, reportProgress) {
  // Process data in chunks
  const items = data.items || []
  const results = []

  for (let i = 0; i < items.length; i++) {
    // Process item
    const processed = await processItem(items[i])
    results.push(processed)

    // Report progress
    reportProgress((i / items.length) * 100)
  }

  return results
}

async function processItem(item) {
  // Simulate processing
  return new Promise(resolve => {
    setTimeout(() => {
      resolve({ ...item, processed: true })
    }, 10)
  })
}

async function performFileOperation(data, reportProgress) {
  // Example file operation
  const { operation, path } = data

  reportProgress(50)

  // Perform operation
  // ...

  reportProgress(100)

  return { success: true, path }
}
```

### Phase 3: Integration

#### 3.1 Enhanced IPC Schemas

**File:** `lib/conveyor/schemas/user.schema.ts`

```typescript
import { z } from 'zod'

export const userSchema = z.object({
  id: z.string(),
  email: z.string().email().nullable(),
  name: z.string().nullable(),
  settings: z.record(z.any()),
  createdAt: z.date(),
  updatedAt: z.date()
})

export const userIpcSchema = {
  // User management
  'user:get-current': {
    args: z.tuple([]),
    return: userSchema.nullable()
  },

  'user:create': {
    args: z.tuple([
      z.object({
        email: z.string().email().optional(),
        name: z.string().optional()
      })
    ]),
    return: userSchema
  },

  'user:update': {
    args: z.tuple([
      z.string(), // userId
      z.object({
        email: z.string().email().optional(),
        name: z.string().optional(),
        settings: z.record(z.any()).optional()
      })
    ]),
    return: userSchema
  },

  // Conversations
  'user:get-conversations': {
    args: z.tuple([
      z.string(), // userId
      z.object({
        limit: z.number().optional(),
        offset: z.number().optional()
      }).optional()
    ]),
    return: z.array(z.object({
      id: z.string(),
      title: z.string(),
      model: z.string(),
      createdAt: z.date(),
      updatedAt: z.date()
    }))
  }
} as const
```

**File:** `lib/conveyor/schemas/ai.schema.ts`

```typescript
import { z } from 'zod'

export const aiIpcSchema = {
  // Chat
  'ai:chat': {
    args: z.tuple([
      z.string(), // prompt
      z.object({
        model: z.string().optional(),
        temperature: z.number().optional(),
        maxTokens: z.number().optional(),
        userId: z.string().optional(),
        conversationId: z.string().optional()
      }).optional()
    ]),
    return: z.string()
  },

  // Streaming chat
  'ai:chat-stream': {
    args: z.tuple([
      z.string(), // prompt
      z.object({
        model: z.string().optional(),
        temperature: z.number().optional(),
        maxTokens: z.number().optional(),
        userId: z.string().optional(),
        conversationId: z.string().optional()
      }).optional()
    ]),
    return: z.string() // requestId
  },

  // Cancel stream
  'ai:cancel-stream': {
    args: z.tuple([z.string()]), // requestId
    return: z.void()
  },

  // Embeddings
  'ai:create-embedding': {
    args: z.tuple([
      z.string(), // text
      z.object({
        model: z.string().optional()
      }).optional()
    ]),
    return: z.array(z.number())
  },

  // Token counting
  'ai:count-tokens': {
    args: z.tuple([z.string()]), // text
    return: z.number()
  }
} as const
```

#### 3.2 React Hooks

**File:** `app/hooks/useQuery.ts`

```typescript
import { useState, useEffect, useRef, useCallback } from 'react'
import { useConveyor } from './useConveyor'

interface QueryOptions {
  enabled?: boolean
  refetchInterval?: number
  refetchOnFocus?: boolean
  cacheTime?: number
  staleTime?: number
}

interface QueryResult<T> {
  data: T | undefined
  error: Error | null
  isLoading: boolean
  isError: boolean
  isSuccess: boolean
  refetch: () => Promise<void>
}

export function useQuery<T>(
  key: string[],
  queryFn: () => Promise<T>,
  options: QueryOptions = {}
): QueryResult<T> {
  const {
    enabled = true,
    refetchInterval,
    refetchOnFocus = true,
    cacheTime = 5 * 60 * 1000, // 5 minutes
    staleTime = 0
  } = options

  const [data, setData] = useState<T | undefined>(undefined)
  const [error, setError] = useState<Error | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const cacheRef = useRef<{ data: T; timestamp: number } | null>(null)
  const intervalRef = useRef<NodeJS.Timeout>()

  const fetchData = useCallback(async () => {
    // Check cache
    if (cacheRef.current && staleTime > 0) {
      const age = Date.now() - cacheRef.current.timestamp
      if (age < staleTime) {
        setData(cacheRef.current.data)
        return
      }
    }

    setIsLoading(true)
    setError(null)

    try {
      const result = await queryFn()
      setData(result)
      cacheRef.current = { data: result, timestamp: Date.now() }
    } catch (err) {
      setError(err as Error)
    } finally {
      setIsLoading(false)
    }
  }, [queryFn, staleTime])

  const refetch = useCallback(async () => {
    await fetchData()
  }, [fetchData])

  // Initial fetch
  useEffect(() => {
    if (enabled) {
      fetchData()
    }
  }, [enabled, fetchData])

  // Refetch interval
  useEffect(() => {
    if (refetchInterval && enabled) {
      intervalRef.current = setInterval(fetchData, refetchInterval)
      return () => {
        if (intervalRef.current) {
          clearInterval(intervalRef.current)
        }
      }
    }
  }, [refetchInterval, enabled, fetchData])

  // Refetch on focus
  useEffect(() => {
    if (!refetchOnFocus || !enabled) return

    const handleFocus = () => {
      fetchData()
    }

    window.addEventListener('focus', handleFocus)
    return () => {
      window.removeEventListener('focus', handleFocus)
    }
  }, [refetchOnFocus, enabled, fetchData])

  // Cache cleanup
  useEffect(() => {
    const timer = setTimeout(() => {
      cacheRef.current = null
    }, cacheTime)

    return () => {
      clearTimeout(timer)
    }
  }, [data, cacheTime])

  return {
    data,
    error,
    isLoading,
    isError: error !== null,
    isSuccess: data !== undefined && error === null,
    refetch
  }
}
```

**File:** `app/hooks/useMutation.ts`

```typescript
import { useState, useCallback } from 'react'

interface MutationOptions<T> {
  onSuccess?: (data: T) => void
  onError?: (error: Error) => void
  onSettled?: () => void
}

interface MutationResult<T, V> {
  data: T | undefined
  error: Error | null
  isLoading: boolean
  isError: boolean
  isSuccess: boolean
  mutate: (variables: V) => Promise<void>
  mutateAsync: (variables: V) => Promise<T>
  reset: () => void
}

export function useMutation<T = unknown, V = void>(
  mutationFn: (variables: V) => Promise<T>,
  options: MutationOptions<T> = {}
): MutationResult<T, V> {
  const [data, setData] = useState<T | undefined>(undefined)
  const [error, setError] = useState<Error | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const reset = useCallback(() => {
    setData(undefined)
    setError(null)
    setIsLoading(false)
  }, [])

  const mutateAsync = useCallback(async (variables: V): Promise<T> => {
    setIsLoading(true)
    setError(null)

    try {
      const result = await mutationFn(variables)
      setData(result)
      options.onSuccess?.(result)
      return result
    } catch (err) {
      const error = err as Error
      setError(error)
      options.onError?.(error)
      throw error
    } finally {
      setIsLoading(false)
      options.onSettled?.()
    }
  }, [mutationFn, options])

  const mutate = useCallback(async (variables: V): Promise<void> => {
    try {
      await mutateAsync(variables)
    } catch {
      // Error is already handled
    }
  }, [mutateAsync])

  return {
    data,
    error,
    isLoading,
    isError: error !== null,
    isSuccess: data !== undefined && error === null,
    mutate,
    mutateAsync,
    reset
  }
}
```

---

## Testing Strategy

### Unit Tests

**File:** `tests/unit/services/database.test.ts`

```typescript
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { DatabaseService } from '@/lib/main/services/database/database.service'
import { PrismaClient } from '@prisma/client'

describe('DatabaseService', () => {
  let service: DatabaseService

  beforeAll(async () => {
    // Use in-memory SQLite for tests
    process.env.DATABASE_URL = 'file::memory:'

    service = new DatabaseService()
    await service.initialize()
  })

  afterAll(async () => {
    await service.dispose()
  })

  it('should create and retrieve user', async () => {
    const user = await service.prisma.user.create({
      data: {
        email: 'test@example.com',
        name: 'Test User'
      }
    })

    expect(user.email).toBe('test@example.com')

    const found = await service.prisma.user.findUnique({
      where: { id: user.id }
    })

    expect(found).toEqual(user)
  })

  it('should handle transactions', async () => {
    const result = await service.transaction(async (prisma) => {
      const user = await prisma.user.create({
        data: { name: 'Transaction Test' }
      })
      return user
    })

    expect(result.name).toBe('Transaction Test')
  })

  it('should cache values', async () => {
    let calls = 0
    const expensive = async () => {
      calls++
      return 'expensive result'
    }

    const result1 = await service.cached('test-key', expensive, 1000)
    const result2 = await service.cached('test-key', expensive, 1000)

    expect(result1).toBe('expensive result')
    expect(result2).toBe('expensive result')
    expect(calls).toBe(1) // Should only call once
  })
})
```

### Integration Tests

**File:** `tests/integration/conveyor.test.ts`

```typescript
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { serviceManager } from '@/lib/main/services/base/service.manager'
import { DatabaseService } from '@/lib/main/services/database/database.service'
import { OpenAIService } from '@/lib/main/services/openai/openai.service'
import { StorageService } from '@/lib/main/services/storage/storage.service'

describe('Conveyor Integration', () => {
  beforeAll(async () => {
    // Register services
    serviceManager.register('database', new DatabaseService())
    serviceManager.register('storage', new StorageService())
    serviceManager.register('openai', new OpenAIService())

    // Initialize all
    await serviceManager.initializeAll()
  })

  afterAll(async () => {
    await serviceManager.disposeAll()
  })

  it('should handle user creation through IPC', async () => {
    // Mock IPC handler
    const handler = require('@/lib/conveyor/handlers/user.handler')

    const user = await handler.createUser({
      email: 'ipc@example.com',
      name: 'IPC User'
    })

    expect(user.email).toBe('ipc@example.com')
  })

  it('should handle AI chat with caching', async () => {
    const openai = serviceManager.get<OpenAIService>('openai')

    // Mock OpenAI response
    const response = await openai.chat('Hello', {
      userId: 'test-user'
    })

    expect(response).toBeDefined()
  })
})
```

---

## Security Considerations

### 1. Credential Storage
- ✅ Use Electron's `safeStorage` API for encryption
- ✅ Never store credentials in plain text files
- ✅ Prompt for credentials on first run
- ✅ Allow credential rotation

### 2. IPC Security
- ✅ Validate all IPC inputs with Zod
- ✅ Implement rate limiting per channel
- ✅ Add authorization checks for sensitive operations
- ✅ Sanitize error messages before sending to renderer

### 3. Database Security
- ✅ Use parameterized queries (via Prisma)
- ✅ Encrypt sensitive data at rest
- ✅ Implement row-level security for multi-user scenarios
- ✅ Regular backups with encryption

### 4. Network Security
- ✅ Always use HTTPS for API calls
- ✅ Validate SSL certificates
- ✅ Implement request signing where supported
- ✅ Use proxy settings if configured

---

## Production Deployment

### 1. Build Configuration

**File:** `electron-builder.yml`

```yaml
appId: com.yourcompany.app
productName: YourApp
directories:
  output: dist

files:
  - "!**/.vscode/*"
  - "!**/.env"
  - "!**/tests/*"
  - "!**/prisma/migrations/*"
  - "!**/prisma/*.db"
  - "!**/prisma/*.db-journal"

extraResources:
  - from: "prisma/schema.prisma"
    to: "prisma/schema.prisma"

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
```

### 2. Migration Strategy

For production, migrations should be handled carefully:

1. **Development**: Use `prisma migrate dev`
2. **Production Build**: Include only Prisma Client, not migrations
3. **First Run**: Check database version and apply migrations if needed
4. **Updates**: Handle schema updates gracefully with backward compatibility

### 3. Performance Optimization

1. **Database Indexes**: Add indexes for frequently queried fields
2. **Query Optimization**: Use Prisma's `select` and `include` wisely
3. **Caching**: Implement aggressive caching for expensive operations
4. **Lazy Loading**: Load services on demand when possible
5. **Bundle Size**: Use tree shaking and code splitting

### 4. Monitoring

Implement telemetry for:
- Service initialization times
- IPC call frequency and duration
- Database query performance
- API call success/failure rates
- Memory and CPU usage

---

## Summary

This implementation plan provides a **production-ready, offline-first architecture** that:

✅ **Uses SQLite with Prisma** for type-safe local database
✅ **Implements secure credential storage** with Electron's native APIs
✅ **Provides proper service lifecycle management**
✅ **Includes comprehensive error handling** with structured error types
✅ **Supports OpenAI integration** with streaming and caching
✅ **Uses native Worker Threads** instead of external queue services
✅ **Maintains type safety** from database to UI
✅ **Follows best practices** for Electron desktop applications

The architecture is simple, scalable, and focused on developer experience while maintaining security and performance standards suitable for production deployment.