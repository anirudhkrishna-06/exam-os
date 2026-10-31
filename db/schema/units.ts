import { pgTable, uuid, integer, varchar, timestamp, pgEnum, unique } from 'drizzle-orm/pg-core'
import { subjects } from './subjects'

export const unitInitialStatusEnum = pgEnum('unit_initial_status', [
  'new',
  'partially_studied',
  'previously_studied',
])

export const unitDifficultyEnum = pgEnum('unit_difficulty', ['easy', 'medium', 'hard'])

export const units = pgTable('units', {
  id: uuid('id').primaryKey().defaultRandom(),
  subjectId: uuid('subject_id').notNull().references(() => subjects.id, { onDelete: 'cascade' }),
  unitNumber: integer('unit_number').notNull(),
  name: varchar('name', { length: 255 }).notNull(),
  initialStatus: unitInitialStatusEnum('initial_status').default('new').notNull(),
  difficulty: unitDifficultyEnum('difficulty').default('medium').notNull(),
  position: integer('position').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (t) => [
  unique('units_subject_unit_number_unique').on(t.subjectId, t.unitNumber),
])
