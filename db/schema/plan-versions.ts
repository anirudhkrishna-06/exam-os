import { pgTable, uuid, integer, timestamp, pgEnum } from 'drizzle-orm/pg-core'
import { users } from './users'
import { examSeasons } from './exam-seasons'

export const generationTypeEnum = pgEnum('generation_type', [
  'initial',
  'manual_regeneration',
  'automatic_reschedule',
])

export const planVersions = pgTable('plan_versions', {
  id: uuid('id').primaryKey().defaultRandom(),
  seasonId: uuid('season_id').notNull().references(() => examSeasons.id, { onDelete: 'cascade' }),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  versionNumber: integer('version_number').notNull(),
  generationType: generationTypeEnum('generation_type').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
})

