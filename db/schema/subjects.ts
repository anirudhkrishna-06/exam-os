import { pgTable, uuid, varchar, date, integer, timestamp } from 'drizzle-orm/pg-core'
import { users } from './users'
import { examSeasons } from './exam-seasons'

export const subjects = pgTable('subjects', {
  id: uuid('id').primaryKey().defaultRandom(),
  seasonId: uuid('season_id').notNull().references(() => examSeasons.id, { onDelete: 'cascade' }),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 255 }).notNull(),
  examDate: date('exam_date').notNull(),
  color: varchar('color', { length: 20 }),
  position: integer('position').notNull().default(0),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
})

