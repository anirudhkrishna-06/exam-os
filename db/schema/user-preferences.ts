import { pgTable, uuid, varchar, integer, timestamp } from 'drizzle-orm/pg-core'
import { users } from './users'

export const userPreferences = pgTable('user_preferences', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').unique().notNull().references(() => users.id, { onDelete: 'cascade' }),
  timezone: varchar('timezone', { length: 100 }).default('Asia/Kolkata').notNull(),
  defaultSessionsPerDay: integer('default_sessions_per_day').default(4).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
})

