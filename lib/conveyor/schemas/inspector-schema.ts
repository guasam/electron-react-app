import { z } from 'zod'

export const inspectorIpcSchema = {
  'inspector-search-element': {
    args: z.tuple([
      z.object({
        tagName: z.string(),
        id: z.string().optional(),
        className: z.string().optional(),
        componentName: z.string().optional(),
        textContent: z.string().optional(),
      }),
      z.string(), // workspacePath
    ]),
    return: z.object({
      matches: z.array(
        z.object({
          relativePath: z.string(),
          lineNumber: z.number(),
          preview: z.string(),
          score: z.number(),
        })
      ),
    }),
  },
  'inspector-get-element-code': {
    args: z.tuple([
      z.string(), // workspacePath
      z.string(), // relativePath
      z.number(), // lineNumber hint
    ]),
    return: z.object({
      code: z.string(),
      startLine: z.number(),
      endLine: z.number(),
      absolutePath: z.string(),
    }),
  },
} as const

