import { pgTable, uuid, date, time, varchar, integer, text, timestamp, pgEnum } from 'drizzle-orm/pg-core'
import { users } from './users'
import { examSeasons } from './exam-seasons'
import { unitActivities } from './activities'
import { planVersions } from './plan-versions'

export const sessionStatusEnum = pgEnum('session_status', [
  'scheduled',
  'in_progress',
  'completed',
  'skipped',
  'overdue',
])

export const studySessions = pgTable('study_sessions', {
  id: uuid('id').primaryKey().defaultRandom(),
  seasonId: uuid('season_id').notNull().references(() => examSeasons.id, { onDelete: 'cascade' }),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  activityId: uuid('activity_id').notNull().references(() => unitActivities.id, { onDelete: 'cascade' }),
  planVersionId: uuid('plan_version_id').notNull().references(() => planVersions.id, { onDelete: 'cascade' }),
  scheduledDate: date('scheduled_date').notNull(),
  slotName: varchar('slot_name', { length: 100 }).notNull(),
  startTime: time('start_time').notNull(),
  endTime: time('end_time').notNull(),
  position: integer('position').notNull().default(0),
  status: sessionStatusEnum('status').default('scheduled').notNull(),
  estimatedDurationMinutes: integer('estimated_duration_minutes').notNull(),
  actualDurationMinutes: integer('actual_duration_minutes'),
  completionNote: text('completion_note'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
  completedAt: timestamp('completed_at'),
})

