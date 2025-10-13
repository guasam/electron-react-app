import { app } from 'electron'
import path from 'path'
import fs from 'fs/promises'
import log from 'electron-log/main'
import { DatabaseService } from '../core/database.service'
import { FileService } from '../core/file.service'
import { AgentRegistry } from './agents'
import { workflows, type WorkflowId, type WorkflowStep } from './workflows'
import { setSectionTemplates } from './tools/template-loader.tool'
import { sectionTemplates } from './workflows/workflow-templates/section-templates'
import type { WorkflowContext } from '@/lib/main/types/workflow.types'

export class VoltAgentService {
  private memoryPath: string
  private agentRegistry: AgentRegistry

  constructor(
    private db: DatabaseService,
    private files: FileService
  ) {
    this.memoryPath = path.join(app.getPath('userData'), '.voltagent')
    this.agentRegistry = new AgentRegistry()
  }

  async initialize() {
    // Ensure VoltAgent memory directory exists
    await fs.mkdir(this.memoryPath, { recursive: true })

    // Set templates for template-loader tool
    setSectionTemplates(sectionTemplates)

    log.info('VoltAgent initialized with', this.agentRegistry.list().length, 'agents')
  }

  /**
   * Execute a workflow step
   */
  async executeStep(step: WorkflowStep, context: WorkflowContext): Promise<any> {
    if (step.type === 'parallel' && step.steps) {
      // Execute all steps in parallel
      const results = await Promise.all(step.steps.map((s) => this.executeStep(s, context)))
      return { parallel: true, results }
    }

    if (step.execute) {
      return await step.execute(context)
    }

    throw new Error(`Step ${step.name} has no execute function`)
  }

  /**
   * Execute a complete workflow
   */
  async executeWorkflow(workflowId: WorkflowId, runId: string, input: any) {
    const workflowSteps = workflows[workflowId]
    if (!workflowSteps) {
      throw new Error(`Workflow not found: ${workflowId}`)
    }

    // Create context for workflow execution
    const context: WorkflowContext = {
      db: this.db,
      fileService: this.files,
      workflowRunId: runId,
      agentRegistry: this.agentRegistry,
      input,
      results: {},
    }

    const results: any[] = []

    // Execute each step sequentially
    for (let i = 0; i < workflowSteps.length; i++) {
      const step = workflowSteps[i]
      log.info(`Executing step ${i + 1}/${workflowSteps.length}: ${step.name}`)

      const result = await this.executeStep(step, context)
      results.push(result)

      // Store result in context for next steps
      context.results[step.name] = result
    }

    return {
      steps: results,
      completed: true,
    }
  }

  /**
   * Get available workflows
   */
  getWorkflows() {
    return Object.keys(workflows).map((id) => ({
      id,
      name: id.replace(/-/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase()),
      steps: workflows[id].length,
    }))
  }

  /**
   * Get available agents
   */
  getAgents() {
    return this.agentRegistry.list()
  }
}
