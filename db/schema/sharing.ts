import { pgEnum, pgTable, timestamp, uuid, jsonb, varchar, index, unique, text } from 'drizzle-orm/pg-core'
import { users } from './users'
import { studySessions } from './study-sessions'
import { subjects } from './subjects'
import { units } from './units'

export const shareStatusEnum = pgEnum('share_status', ['pending', 'imported', 'declined', 'revoked', 'expired'])

export type SharedContentSnapshot = {
  title: string
  note: { title: string; content: string } | null
  links: Array<{ url: string; nickname: string; category: string }>
  keywords: string[]
}

export const sharedContent = pgTable('shared_content', {
  id: uuid('id').primaryKey().defaultRandom(),
  contentHash: varchar('content_hash', { length: 64 }).notNull().unique(),
  content: jsonb('content').$type<SharedContentSnapshot>().notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
})

export const sessionShares = pgTable('session_shares', {
  id: uuid('id').primaryKey().defaultRandom(),
  senderUserId: uuid('sender_user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  recipientUserId: uuid('recipient_user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  sharedContentId: uuid('shared_content_id').notNull().references(() => sharedContent.id, { onDelete: 'restrict' }),
  originalSessionId: uuid('original_session_id').references(() => studySessions.id, { onDelete: 'set null' }),
  status: shareStatusEnum('status').default('pending').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  expiresAt: timestamp('expires_at').notNull(),
  respondedAt: timestamp('responded_at'),
  revokedAt: timestamp('revoked_at'),
}, (table) => [
  index('session_shares_recipient_status_idx').on(table.recipientUserId, table.status),
  index('session_shares_sender_status_idx').on(table.senderUserId, table.status),
  unique('session_shares_active_unique').on(table.senderUserId, table.recipientUserId, table.sharedContentId, table.status),
])

export const unitContentImports = pgTable('unit_content_imports', {
  id: uuid('id').primaryKey().defaultRandom(),
  shareId: uuid('share_id').notNull().unique().references(() => sessionShares.id, { onDelete: 'cascade' }),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  subjectId: uuid('subject_id').notNull().references(() => subjects.id, { onDelete: 'cascade' }),
  unitId: uuid('unit_id').notNull().references(() => units.id, { onDelete: 'cascade' }),
  sharedContentId: uuid('shared_content_id').notNull().references(() => sharedContent.id, { onDelete: 'restrict' }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => [
  index('unit_content_imports_user_unit_idx').on(table.userId, table.unitId),
  index('unit_content_imports_snapshot_idx').on(table.sharedContentId),
])

// External shares are separate from registered-user shares. Only hashes of
// the URL token and passcode are stored.
export const externalShares = pgTable('external_shares', {
  id: uuid('id').primaryKey().defaultRandom(),
  ownerUserId: uuid('owner_user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  originalSessionId: uuid('original_session_id').notNull().references(() => studySessions.id, { onDelete: 'cascade' }),
  sharedContentId: uuid('shared_content_id').notNull().references(() => sharedContent.id, { onDelete: 'restrict' }),
  tokenHash: varchar('token_hash', { length: 64 }).notNull().unique(),
  passcodeHash: text('passcode_hash').notNull(),
  expiresAt: timestamp('expires_at'),
  revokedAt: timestamp('revoked_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => [
  index('external_shares_owner_idx').on(table.ownerUserId),
  index('external_shares_session_idx').on(table.originalSessionId),
])

export const externalShareSessions = pgTable('external_share_sessions', {
  id: uuid('id').primaryKey().defaultRandom(),
  shareId: uuid('share_id').notNull().references(() => externalShares.id, { onDelete: 'cascade' }),
  sessionHash: varchar('session_hash', { length: 64 }).notNull().unique(),
  expiresAt: timestamp('expires_at').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => [
  index('external_share_sessions_share_idx').on(table.shareId),
  index('external_share_sessions_expiry_idx').on(table.expiresAt),
])
