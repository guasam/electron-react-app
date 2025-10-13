import { sectionTemplates } from './workflow-templates/section-templates'
import { promptTemplates } from './workflow-templates/prompt-templates'
import type { WorkflowContext } from '@/lib/main/types/workflow.types'

export interface WorkflowStep {
  name: string
  type: 'agent' | 'function' | 'parallel'
  agentName?: string
  execute?: (context: WorkflowContext) => Promise<any>
  steps?: WorkflowStep[] // For parallel execution
}

export const dischargePermitWorkflow: WorkflowStep[] = [
  // Step 0: Extract data from uploaded documents
  {
    name: 'extract_data',
    type: 'agent',
    agentName: 'data-extractor',
    execute: async (context: WorkflowContext) => {
      const agent = context.agentRegistry.get('data-extractor')

      const fields = {
        project_name: 'Name of the project or facility',
        location: 'Physical address or location',
        discharge_type: 'Type of wastewater discharge',
        flow_rate: 'Wastewater flow rate',
        treatment_system: 'Treatment system description',
      }

      const prompt = promptTemplates.extractData(context.input.uploadedFileIds, fields)
      const result = await agent.run(prompt, { context })

      try {
        const extractedData = JSON.parse(result.content || '{}')
        context.extractedData = extractedData
        return { extractedData }
      } catch (error) {
        context.extractedData = {}
        return { extractedData: {}, error: 'Failed to parse extracted data' }
      }
    },
  },

  // Step 1-5: Generate all sections in parallel
  {
    name: 'generate_sections',
    type: 'parallel',
    steps: [
      {
        name: 'executive_summary',
        type: 'agent',
        agentName: 'section-writer',
        execute: async (context: WorkflowContext) => {
          const agent = context.agentRegistry.get('section-writer')
          const template = sectionTemplates.executive_summary
          const prompt = promptTemplates.generateSection('Executive Summary', template, {
            projectInfo: context.input.projectInfo,
            extractedData: context.extractedData,
            uploadedFiles: context.input.uploadedFileIds,
          })

          await agent.run(prompt, { context })
          return { section: 'executive_summary', completed: true }
        },
      },
      {
        name: 'project_description',
        type: 'agent',
        agentName: 'section-writer',
        execute: async (context: WorkflowContext) => {
          const agent = context.agentRegistry.get('section-writer')
          const template = sectionTemplates.project_description
          const prompt = promptTemplates.generateSection('Project Description', template, {
            projectInfo: context.input.projectInfo,
            extractedData: context.extractedData,
          })

          await agent.run(prompt, { context })
          return { section: 'project_description', completed: true }
        },
      },
      {
        name: 'wastewater_characterization',
        type: 'agent',
        agentName: 'section-writer',
        execute: async (context: WorkflowContext) => {
          const agent = context.agentRegistry.get('section-writer')
          const template = sectionTemplates.wastewater_characterization
          const prompt = promptTemplates.generateSection('Wastewater Characterization', template, {
            extractedData: context.extractedData,
          })

          await agent.run(prompt, { context })
          return { section: 'wastewater_characterization', completed: true }
        },
      },
      {
        name: 'treatment_design',
        type: 'agent',
        agentName: 'section-writer',
        execute: async (context: WorkflowContext) => {
          const agent = context.agentRegistry.get('section-writer')
          const template = sectionTemplates.treatment_design
          const prompt = promptTemplates.generateSection('Treatment System Design', template, {
            extractedData: context.extractedData,
          })

          await agent.run(prompt, { context })
          return { section: 'treatment_design', completed: true }
        },
      },
      {
        name: 'compliance_analysis',
        type: 'agent',
        agentName: 'section-writer',
        execute: async (context: WorkflowContext) => {
          const agent = context.agentRegistry.get('section-writer')
          const template = sectionTemplates.compliance_analysis
          const prompt = promptTemplates.generateSection('Compliance Analysis', template, {
            extractedData: context.extractedData,
          })

          await agent.run(prompt, { context })
          return { section: 'compliance_analysis', completed: true }
        },
      },
    ],
  },

  // Step 6: Compile final document
  {
    name: 'compile_document',
    type: 'agent',
    agentName: 'document-generator',
    execute: async (context: WorkflowContext) => {
      const agent = context.agentRegistry.get('document-generator')
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
    },
  },

  // Step 7: Optional validation
  {
    name: 'validate_document',
    type: 'agent',
    agentName: 'validator',
    execute: async (context: WorkflowContext) => {
      // Skip if validation not enabled
      if (!context.input.projectInfo?.enableValidation) {
        return { skipped: true }
      }

      const agent = context.agentRegistry.get('validator')
      const requirements = {
        requiredSections: Object.keys(sectionTemplates),
        minLengthPerSection: 800,
        mustInclude: ['calculations', 'citations', 'tables'],
      }

      const prompt = promptTemplates.validateDocument(requirements)
      const result = await agent.run(prompt, { context })

      try {
        const validation = JSON.parse(result.content || '{}')
        return {
          validation: {
            passed: validation.passed,
            issues: validation.issues || [],
            recommendations: validation.recommendations || [],
          },
        }
      } catch (error) {
        return { validation: { passed: false, issues: [], recommendations: [] } }
      }
    },
  },
]
