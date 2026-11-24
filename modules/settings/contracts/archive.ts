import { z } from 'zod'
// Portable file format, independent of the IPC contract.
export const archiveSchema = z
  .object({
    version: z.literal(1),
    settings: z
      .array(
        z
          .object({
            key: z
              .string()
              .trim()
              .min(1)
              .max(100)
              .regex(/^[A-Za-z0-9][A-Za-z0-9._-]*$/),
            value: z.string().max(5000),
          })
          .strict()
      )
      .max(1000)
      .refine((rows) => new Set(rows.map((row) => row.key)).size === rows.length, 'Archive keys must be unique.'),
  })
  .strict()
