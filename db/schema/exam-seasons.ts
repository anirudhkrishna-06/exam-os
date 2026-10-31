import { pgTable, uuid, varchar, date, timestamp, pgEnum } from 'drizzle-orm/pg-core'
import { users } from './users'

export const seasonStatusEnum = pgEnum('season_status', ['draft', 'active', 'completed', 'archived'])

export const examSeasons = pgTable('exam_seasons', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 255 }).notNull(),
  startDate: date('start_date').notNull(),
  endDate: date('end_date').notNull(),
  status: seasonStatusEnum('status').default('draft').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
})

