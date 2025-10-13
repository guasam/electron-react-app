import type { Agent } from '@voltagent/core'
import { createSectionWriterAgent } from './section-writer.agent'
import { createDocumentGeneratorAgent } from './document-generator.agent'
import { createReviewerAgent } from './reviewer.agent'
import { createDataExtractorAgent} from './data-extractor.agent'
import { createValidatorAgent } from './validator.agent'

export class AgentRegistry {
  private agents = new Map<string, Agent>()

  constructor() {
    this.initialize()
  }

  private initialize() {
    // Register all agents
    this.register('section-writer', createSectionWriterAgent())
    this.register('document-generator', createDocumentGeneratorAgent())
    this.register('reviewer', createReviewerAgent())
    this.register('data-extractor', createDataExtractorAgent())
    this.register('validator', createValidatorAgent())
  }

  register(name: string, agent: Agent) {
    this.agents.set(name, agent)
  }

  get(name: string): Agent {
    const agent = this.agents.get(name)
    if (!agent) {
      throw new Error(`Agent not found: ${name}`)
    }
    return agent
  }

  list(): string[] {
    return Array.from(this.agents.keys())
  }
}
