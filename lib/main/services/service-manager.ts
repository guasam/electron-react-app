import { DatabaseService } from './core/database.service'
import { EventBusService } from './core/event-bus.service'
import { FileService } from './core/file.service'
import { ApiKeyService } from './core/api-key.service'
import { VoltAgentService } from './voltagent'
import { WorkflowExecutor } from './workflow/workflow-executor'
import { WorkflowRecoveryService } from './workflow/workflow-recovery.service'
import { HumanReviewService } from './workflow/human-review.service'
import log from 'electron-log/main'

class ServiceManager {
  private services = new Map<string, any>()
  private initialized = false

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

  has(name: string): boolean {
    return this.services.has(name)
  }

  isInitialized(): boolean {
    return this.initialized
  }

  setInitialized() {
    this.initialized = true
  }
}

export const serviceManager = new ServiceManager()

export async function initializeServices() {
  if (serviceManager.isInitialized()) {
    log.warn('Services already initialized')
    return
  }

  log.info('Initializing services...')

  // 1. EventBus (no dependencies)
  const eventBus = new EventBusService()
  serviceManager.register('eventBus', eventBus)
  log.info('✓ EventBus initialized')

  // 2. Database
  const db = new DatabaseService()
  await db.initialize()
  serviceManager.register('database', db)
  log.info('✓ Database initialized')

  // 3. File Service
  const files = new FileService(db, eventBus)
  await files.initialize()
  serviceManager.register('files', files)
  log.info('✓ File Service initialized')

  // 4. API Key Service
  const apiKeys = new ApiKeyService(db)
  serviceManager.register('apiKeys', apiKeys)
  log.info('✓ API Key Service initialized')

  // 5. Load API key into environment
  const openaiKey = await apiKeys.get()
  if (openaiKey) {
    process.env.OPENAI_API_KEY = openaiKey
    log.info('✓ OpenAI API key loaded')
  } else {
    log.warn('⚠ No OpenAI API key found - VoltAgent features will be limited')
  }

  // 6. VoltAgent Service
  const voltAgent = new VoltAgentService(db, files)
  await voltAgent.initialize()
  serviceManager.register('voltAgent', voltAgent)
  log.info('✓ VoltAgent Service initialized')

  // 7. Workflow Executor
  const workflowExecutor = new WorkflowExecutor(voltAgent, db, eventBus)
  serviceManager.register('workflowExecutor', workflowExecutor)
  log.info('✓ Workflow Executor initialized')

  // 8. Workflow Recovery Service
  const workflowRecovery = new WorkflowRecoveryService(db, eventBus)
  serviceManager.register('workflowRecovery', workflowRecovery)
  log.info('✓ Workflow Recovery Service initialized')

  // 9. Human Review Service
  const humanReview = new HumanReviewService(db, eventBus)
  serviceManager.register('humanReview', humanReview)
  log.info('✓ Human Review Service initialized')

  serviceManager.setInitialized()
  log.info('🎉 All services initialized successfully')
}

export async function disposeServices() {
  log.info('Disposing services...')

  try {
    const db = serviceManager.get<DatabaseService>('database')
    await db.dispose()
    log.info('✓ Database disposed')
  } catch (error) {
    log.error('Failed to dispose database:', error)
  }
}
