import { pgTable, uuid, date, time, varchar, boolean, integer, timestamp } from 'drizzle-orm/pg-core'
import { users } from './users'
import { examSeasons } from './exam-seasons'
import { dailySessionTemplates } from './daily-templates'

export const dailySlotOverrides = pgTable('daily_slot_overrides', {
  id: uuid('id').primaryKey().defaultRandom(),
  seasonId: uuid('season_id').notNull().references(() => examSeasons.id, { onDelete: 'cascade' }),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  date: date('date').notNull(),
  // Nullable — custom (non-template) slots won't have a template reference
  templateId: uuid('template_id').references(() => dailySessionTemplates.id, { onDelete: 'set null' }),
  slotName: varchar('slot_name', { length: 100 }).notNull(),
  // Snapshot the timings so later template edits don't rewrite existing schedules
  startTime: time('start_time').notNull(),
  endTime: time('end_time').notNull(),
  isAvailable: boolean('is_available').default(true).notNull(),
  position: integer('position').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
})

