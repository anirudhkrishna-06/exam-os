import { pgTable, uuid, date, varchar, timestamp, pgEnum } from 'drizzle-orm/pg-core'
import { users } from './users'
import { studySessions } from './study-sessions'

export const sessionActionEnum = pgEnum('session_action', [
  'created',
  'rescheduled',
  'completed',
  'skipped',
  'edited',
])

export const sessionHistory = pgTable('session_history', {
  id: uuid('id').primaryKey().defaultRandom(),
  studySessionId: uuid('study_session_id').notNull().references(() => studySessions.id, { onDelete: 'cascade' }),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  previousDate: date('previous_date'),
  newDate: date('new_date'),
  previousStatus: varchar('previous_status', { length: 50 }),
  newStatus: varchar('new_status', { length: 50 }),
  action: sessionActionEnum('action').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
})

