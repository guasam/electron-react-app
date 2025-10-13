export const sectionTemplates = {
  executive_summary: {
    structure: ['Project Overview', 'Purpose and Scope', 'Key Findings', 'Recommendations'],
    guidelines: `
- Length: 2-3 pages
- Audience: Technical reviewers and decision makers
- Style: Professional, concise, no jargon
- Include: Project name, location, permit type, key conclusions
    `,
    minLength: 800,
    maxLength: 1500,
    example: `
# Executive Summary

## Project Overview
[Brief description of project and facility]

## Purpose and Scope
[Why this report is being prepared, what it covers]

## Key Findings
[Main technical findings and analyses]

## Recommendations
[Primary recommendations for permit approval]
    `,
  },

  project_description: {
    structure: [
      'Project Location',
      'Facility Description',
      'Process Description',
      'Wastewater Sources',
    ],
    guidelines: `
- Length: 3-5 pages
- Include: Maps, diagrams, flow charts
- Detail: Specific equipment, capacities, operations
- Context: Historical background if applicable
    `,
    minLength: 1500,
    maxLength: 3000,
  },

  wastewater_characterization: {
    structure: ['Flow Characteristics', 'Quality Parameters', 'Pollutant Analysis', 'Sampling Data'],
    guidelines: `
- Length: 4-6 pages
- Required: Tables of analytical data
- Include: Statistical analysis, trends
- Units: Consistent throughout (mg/L, gpd, etc.)
    `,
    minLength: 2000,
    maxLength: 4000,
  },

  treatment_design: {
    structure: [
      'Treatment Process Overview',
      'Design Criteria',
      'Engineering Calculations',
      'Equipment Specifications',
      'Performance Expectations',
    ],
    guidelines: `
- Length: 6-10 pages
- Required: Detailed calculations, design drawings
- Include: Safety factors, redundancy, O&M considerations
- Standards: Reference applicable design standards
    `,
    minLength: 3000,
    maxLength: 6000,
  },

  compliance_analysis: {
    structure: [
      'Applicable Regulations',
      'Discharge Standards',
      'Compliance Demonstration',
      'Monitoring Plan',
    ],
    guidelines: `
- Length: 3-5 pages
- Required: Cite specific regulations by number
- Include: Comparison tables (limits vs. expected performance)
- Detail: Monitoring frequency, methods, reporting
    `,
    minLength: 1500,
    maxLength: 3000,
  },
}

export type SectionTemplateName = keyof typeof sectionTemplates
