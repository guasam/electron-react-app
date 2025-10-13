export type WorkflowStatus = 'pending' | 'running' | 'paused' | 'completed' | 'failed' | 'cancelled'
export type StepStatus = 'pending' | 'running' | 'completed' | 'failed' | 'skipped'
export type FileType = 'upload' | 'generated' | 'intermediate'
export type ReviewStatus = 'pending' | 'approved' | 'rejected' | 'revised'

export interface WorkflowContext {
  db: any
  fileService: any
  workflowRunId: string
  agentRegistry?: any
  extractedData?: Record<string, any>
  [key: string]: any
}

export interface ProgressEvent {
  runId: string
  step: number
  totalSteps: number
  status: string
  message: string
  data?: any
}
