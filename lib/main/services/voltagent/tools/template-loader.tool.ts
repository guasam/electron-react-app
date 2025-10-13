import { createTool } from '@voltagent/core'
import { z } from 'zod'

// We'll import this from the templates file once created
let sectionTemplates: Record<string, any> = {}

// Function to set templates (will be called during initialization)
export function setSectionTemplates(templates: Record<string, any>) {
  sectionTemplates = templates
}

export const templateLoaderTool = createTool({
  name: 'load_template',
  description: 'Load a predefined section template with formatting guidelines',
  parameters: z.object({
    templateName: z
      .string()
      .describe('Template name (e.g., executive_summary, project_description)'),
  }),
  execute: async ({ templateName }) => {
    const template = sectionTemplates[templateName]

    if (!template) {
      return {
        error: `Template not found: ${templateName}`,
        available: Object.keys(sectionTemplates),
      }
    }

    return {
      structure: template.structure,
      guidelines: template.guidelines,
      example: template.example || null,
      minLength: template.minLength,
      maxLength: template.maxLength,
    }
  },
})
