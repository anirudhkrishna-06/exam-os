import { boolean, integer, pgTable, timestamp } from 'drizzle-orm/pg-core'

export const appSettings = pgTable('app_settings', {
  id: integer('id').primaryKey().default(1),
  registrationEnabled: boolean('registration_enabled').notNull().default(true),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
})
