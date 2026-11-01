import { pgTable, uuid, varchar, text, timestamp, unique } from 'drizzle-orm/pg-core'
import { users } from './users'
import { units } from './units'

export const unitNotes = pgTable('unit_notes', {
  id: uuid('id').primaryKey().defaultRandom(), unitId: uuid('unit_id').notNull().references(() => units.id, { onDelete: 'cascade' }), userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }), title: varchar('title', { length: 255 }).default('Untitled note').notNull(), content: text('content').default('').notNull(), createdAt: timestamp('created_at').defaultNow().notNull(), updatedAt: timestamp('updated_at').defaultNow().notNull(),
})
export const unitLinks = pgTable('unit_links', {
  id: uuid('id').primaryKey().defaultRandom(), unitId: uuid('unit_id').notNull().references(() => units.id, { onDelete: 'cascade' }), userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }), url: text('url').notNull(), nickname: varchar('nickname', { length: 255 }).notNull(), category: varchar('category', { length: 100 }).default('Other').notNull(), createdAt: timestamp('created_at').defaultNow().notNull(), updatedAt: timestamp('updated_at').defaultNow().notNull(),
})
export const unitKeywords = pgTable('unit_keywords', {
  id: uuid('id').primaryKey().defaultRandom(), unitId: uuid('unit_id').notNull().references(() => units.id, { onDelete: 'cascade' }), userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }), keyword: varchar('keyword', { length: 100 }).notNull(), createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => [unique('unit_keywords_unit_keyword_unique').on(table.unitId, table.keyword)])
