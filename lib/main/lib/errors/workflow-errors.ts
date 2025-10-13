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
