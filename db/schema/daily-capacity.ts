import { pgTable, uuid, date, integer, boolean, timestamp, unique } from 'drizzle-orm/pg-core'
import { users } from './users'
import { examSeasons } from './exam-seasons'

export const dailyCapacity = pgTable('daily_capacity', {
  id: uuid('id').primaryKey().defaultRandom(),
  seasonId: uuid('season_id').notNull().references(() => examSeasons.id, { onDelete: 'cascade' }),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  date: date('date').notNull(),
  sessionCount: integer('session_count').notNull(),
  isRestDay: boolean('is_rest_day').default(false).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (t) => [
  unique('daily_capacity_user_season_date_unique').on(t.userId, t.seasonId, t.date),
])

