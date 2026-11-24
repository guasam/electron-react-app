import { defineConfig } from 'drizzle-kit'
export default defineConfig({
  dialect: 'sqlite',
  schema: './modules/settings/infrastructure/schema.ts',
  out: './drizzle',
  ...(process.env.STARTER_DATABASE_PATH ? { dbCredentials: { url: process.env.STARTER_DATABASE_PATH } } : {}),
})
