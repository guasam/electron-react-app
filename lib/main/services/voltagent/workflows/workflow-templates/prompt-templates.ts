export const promptTemplates = {
  generateSection: (sectionName: string, template: any, context: any) => `
Generate the "${sectionName}" section for an Engineer's Report.

## Template Structure
${template.structure.join('\n')}

## Guidelines
${template.guidelines}

## Length Requirements
- Minimum: ${template.minLength} words
- Maximum: ${template.maxLength} words

## Available Information
${JSON.stringify(context, null, 2)}

## Instructions
1. Review uploaded documents using read_file tool
2. Extract relevant data using parse_document tool
3. Follow the template structure exactly
4. Write in professional technical style
5. Include specific data, calculations, and citations
6. Save the result using save_file tool

Generate the complete section now.
  `,

  compileDocument: (sections: string[]) => `
Compile a complete Engineer's Report from the following sections:

${sections.map((s, i) => `${i + 1}. ${s}`).join('\n')}

Create a professional document with:
1. Title page
2. Table of Contents (with page numbers)
3. All sections in order
4. Consistent formatting (headings, lists, tables)
5. Page numbers
6. Professional layout

Use read_file to access each section.
Output as well-formatted Markdown.
Save as "engineers-report-complete.md" using save_file.
  `,

  validateDocument: (requirements: any) => `
Validate the Engineer's Report against the following requirements:

${JSON.stringify(requirements, null, 2)}

Check for:
1. All required sections present
2. Each section meets minimum length
3. Technical accuracy and consistency
4. Proper citations and references
5. Regulatory compliance
6. Formatting and structure

Return a structured validation report with:
- Overall pass/fail
- Issues found (by severity)
- Specific recommendations
- Missing elements
  `,

  extractData: (fileIds: string[], fields: Record<string, string>) => `
Extract structured information from the uploaded documents for a wastewater discharge permit application.

Files to analyze: ${fileIds.join(', ')}

Extract the following fields:
${Object.entries(fields)
  .map(([key, desc]) => `- ${key}: ${desc}`)
  .join('\n')}

Instructions:
1. Use read_file tool to access each document
2. Use extract_pdf tool if the document is a PDF
3. Use parse_document tool to extract structured data
4. Compile all extracted information
5. Return as JSON with the requested fields

Return your findings as a JSON object.
  `,
}
