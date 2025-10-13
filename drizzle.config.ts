import { defineConfig } from 'drizzle-kit'

export default defineConfig({
  schema: './lib/main/db/schema.ts',
  out: './drizzle',
  dialect: 'sqlite',
  dbCredentials: {
    url: './workflows.db',
  },
})
