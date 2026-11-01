import { pgTable, uuid, varchar, text, timestamp, unique } from 'drizzle-orm/pg-core'
import { users } from './users'
import { studySessions } from './study-sessions'

export const sessionNotes = pgTable('session_notes', {
  id: uuid('id').primaryKey().defaultRandom(),
  sessionId: uuid('session_id').notNull().unique().references(() => studySessions.id, { onDelete: 'cascade' }),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  title: varchar('title', { length: 255 }).default('Untitled note').notNull(),
  content: text('content').default('').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
})

export const knowledgeLinks = pgTable('knowledge_links', {
  id: uuid('id').primaryKey().defaultRandom(),
  sessionId: uuid('session_id').notNull().references(() => studySessions.id, { onDelete: 'cascade' }),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  url: text('url').notNull(),
  nickname: varchar('nickname', { length: 255 }).notNull(),
  category: varchar('category', { length: 100 }).default('Other').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
})

export const sessionKeywords = pgTable('session_keywords', {
  id: uuid('id').primaryKey().defaultRandom(),
  sessionId: uuid('session_id').notNull().references(() => studySessions.id, { onDelete: 'cascade' }),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  keyword: varchar('keyword', { length: 100 }).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => [unique('session_keywords_session_keyword_unique').on(table.sessionId, table.keyword)])
