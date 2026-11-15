import { pgEnum, pgTable, uuid, varchar, text, bigint, integer, timestamp, index, unique, check } from 'drizzle-orm/pg-core'
import { sql } from 'drizzle-orm'
import { users } from './users'
import { sessionNotes } from './knowledge'
import { unitNotes } from './unit-knowledge'
import { sharedContent } from './sharing'

export const mediaAssetStatusEnum = pgEnum('media_asset_status', ['pending', 'uploaded', 'ready', 'failed'])

export const mediaAssets = pgTable('media_assets', {
  id: uuid('id').primaryKey().defaultRandom(),
  ownerId: uuid('owner_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  provider: varchar('provider', { length: 32 }).notNull().default('backblaze-b2'),
  objectKey: text('object_key').notNull().unique(),
  originalFilename: varchar('original_filename', { length: 255 }).notNull(),
  mimeType: varchar('mime_type', { length: 128 }).notNull(),
  fileSize: bigint('file_size', { mode: 'number' }).notNull(),
  width: integer('width'),
  height: integer('height'),
  status: mediaAssetStatusEnum('status').notNull().default('pending'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => [index('media_assets_owner_status_idx').on(table.ownerId, table.status)])

export const mediaNoteRefs = pgTable('media_note_refs', {
  id: uuid('id').primaryKey().defaultRandom(),
  assetId: uuid('asset_id').notNull().references(() => mediaAssets.id, { onDelete: 'cascade' }),
  sessionNoteId: uuid('session_note_id').references(() => sessionNotes.id, { onDelete: 'cascade' }),
  unitNoteId: uuid('unit_note_id').references(() => unitNotes.id, { onDelete: 'cascade' }),
  position: integer('position').notNull().default(0),
  caption: varchar('caption', { length: 500 }),
  altText: varchar('alt_text', { length: 500 }),
  alignment: varchar('alignment', { length: 16 }).notNull().default('left'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => [
  unique('media_note_refs_asset_session_unique').on(table.assetId, table.sessionNoteId),
  unique('media_note_refs_asset_unit_unique').on(table.assetId, table.unitNoteId),
  check('media_note_refs_one_note_check', sql`num_nonnulls(${table.sessionNoteId}, ${table.unitNoteId}) = 1`),
  index('media_note_refs_session_idx').on(table.sessionNoteId),
  index('media_note_refs_unit_idx').on(table.unitNoteId),
])

export const mediaSnapshotRefs = pgTable('media_snapshot_refs', {
  id: uuid('id').primaryKey().defaultRandom(),
  assetId: uuid('asset_id').notNull().references(() => mediaAssets.id, { onDelete: 'restrict' }),
  sharedContentId: uuid('shared_content_id').notNull().references(() => sharedContent.id, { onDelete: 'cascade' }),
}, (table) => [unique('media_snapshot_refs_asset_snapshot_unique').on(table.assetId, table.sharedContentId)])
