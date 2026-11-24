import { sql } from 'drizzle-orm'
import { sqliteTable, text, integer, check } from 'drizzle-orm/sqlite-core'

export const settings = sqliteTable(
  'settings',
  {
    key: text('key').primaryKey(),
    generation: text('generation').notNull(),
    value: text('value').notNull(),
    createdAt: text('created_at').notNull(),
    updatedAt: text('updated_at').notNull(),
    version: integer('version').notNull().default(1),
  },
  (table) => [
    check(
      'settings_key_format',
      sql`length(${table.key}) BETWEEN 1 AND 100 AND ${table.key} NOT GLOB '*[^A-Za-z0-9._-]*' AND substr(${table.key}, 1, 1) GLOB '[A-Za-z0-9]'`
    ),
    check('settings_value_length', sql`length(${table.value}) <= 5000`),
    check('settings_version_positive', sql`${table.version} > 0`),
  ]
)
