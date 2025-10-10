import { z } from 'zod'

export const updaterIpcSchema = {
  'updater-check': {
    args: z.tuple([]),
    return: z.void(),
  },
  'updater-get-status': {
    args: z.tuple([]),
    return: z.object({
      status: z.string(),
      message: z.string().optional(),
      progress: z.number().optional(),
    }),
  },
} as const