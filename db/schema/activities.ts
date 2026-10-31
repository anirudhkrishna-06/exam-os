import { pgTable, uuid, boolean, integer, timestamp, decimal, pgEnum, unique } from 'drizzle-orm/pg-core'
import { units } from './units'

export const activityTypeEnum = pgEnum('activity_type', [
  'theory_1',
  'theory_2',
  'numericals',
  'previous_papers',
  'revision',
])

export const activityStatusEnum = pgEnum('activity_status', [
  'not_started',
  'in_progress',
  'completed',
])

export const unitActivities = pgTable('unit_activities', {
  id: uuid('id').primaryKey().defaultRandom(),
  unitId: uuid('unit_id').notNull().references(() => units.id, { onDelete: 'cascade' }),
  activityType: activityTypeEnum('activity_type').notNull(),
  enabled: boolean('enabled').default(true).notNull(),
  status: activityStatusEnum('status').default('not_started').notNull(),
  weight: decimal('weight', { precision: 5, scale: 2 }).notNull(),
  estimatedSessions: integer('estimated_sessions').default(2).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (t) => [
  unique('unit_activities_unit_activity_type_unique').on(t.unitId, t.activityType),
])
