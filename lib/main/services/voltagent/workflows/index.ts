import { dischargePermitWorkflow, type WorkflowStep } from './discharge-permit.workflow'

export const workflows: Record<string, WorkflowStep[]> = {
  'discharge-permit': dischargePermitWorkflow,
}

export type WorkflowId = keyof typeof workflows

export { type WorkflowStep } from './discharge-permit.workflow'
