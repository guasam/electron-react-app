import { ConveyorApi } from '@/lib/preload/shared'

export class WorkflowApi extends ConveyorApi {
  // Workflow management
  listAvailable = () => this.invoke('workflow:list-available')

  createRun = (workflowId: string, data?: any) => this.invoke('workflow:create-run', workflowId, data)

  execute = (runId: string) => this.invoke('workflow:execute', runId)

  listRuns = () => this.invoke('workflow:list-runs')

  getRun = (runId: string) => this.invoke('workflow:get-run', runId)

  // File management
  uploadFile = (runId: string, filename: string, data: Uint8Array, category?: string) =>
    this.invoke('file:upload', runId, filename, data, category)

  listFiles = (runId: string) => this.invoke('file:list', runId)

  readFile = (fileId: string) => this.invoke('file:read', fileId)

  // API Key management
  saveApiKey = (key: string) => this.invoke('api-key:save', key)

  apiKeyExists = () => this.invoke('api-key:exists')

  deleteApiKey = () => this.invoke('api-key:delete')
}
