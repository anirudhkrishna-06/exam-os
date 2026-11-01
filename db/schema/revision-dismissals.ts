import { pgTable, uuid, date, timestamp, unique } from 'drizzle-orm/pg-core'
import { users } from './users'
import { unitActivities } from './activities'

export const revisionDismissals = pgTable('revision_dismissals', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  activityId: uuid('activity_id').notNull().references(() => unitActivities.id, { onDelete: 'cascade' }),
  suggestedDate: date('suggested_date').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => [unique('revision_dismissals_user_activity_date_unique').on(table.userId, table.activityId, table.suggestedDate)])
