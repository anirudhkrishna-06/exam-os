import 'server-only'
import { randomUUID } from 'crypto'
import { and, eq, inArray, lt, or, sql } from 'drizzle-orm'
import { db } from '@/db'
import { mediaAssets, mediaNoteRefs } from '@/db/schema/media'
import { sessionNotes } from '@/db/schema/knowledge'
import { unitNotes } from '@/db/schema/unit-knowledge'
import { studySessions } from '@/db/schema/study-sessions'
import { unitActivities } from '@/db/schema/activities'
import { units } from '@/db/schema/units'
import { subjects } from '@/db/schema/subjects'
import { b2Storage } from '@/lib/media/storage'
import { IMAGE_TYPES, MEDIA_TYPES, MAX_MEDIA_BYTES, hasValidMediaSignature, safeMediaFilename } from '@/lib/media/validation'

function idsFromHtml(content: string) { return [...content.matchAll(/data-asset-id=["']([0-9a-f-]{36})["']/gi)].map((match) => match[1]) }

export async function prepareMediaUpload(ownerId: string, input: { filename: string; mimeType: string; size: number; width?: number; height?: number }) {
  if (!(MEDIA_TYPES as readonly string[]).includes(input.mimeType)) throw new Error('Only PNG, JPEG, WebP images and PDF files are supported')
  if (!Number.isSafeInteger(input.size) || input.size <= 0 || input.size > MAX_MEDIA_BYTES) throw new Error('Files must be smaller than 25 MB')
  const id = randomUUID(); const filename = safeMediaFilename(input.filename); const key = `users/${ownerId}/media/${id}-${filename}`
  const [asset] = await db.insert(mediaAssets).values({ id, ownerId, objectKey: key, originalFilename: filename, mimeType: input.mimeType, fileSize: input.size, width: input.width, height: input.height }).returning()
  try { return { asset, uploadUrl: await b2Storage.putUrl(key, input.mimeType) } } catch (error) { await db.update(mediaAssets).set({ status: 'failed' }).where(eq(mediaAssets.id, id)); throw error }
}

export async function completeMediaUpload(ownerId: string, assetId: string) {
  const asset = await db.query.mediaAssets.findFirst({ where: and(eq(mediaAssets.id, assetId), eq(mediaAssets.ownerId, ownerId)) })
  if (!asset) throw new Error('Asset not found')
  const head = await b2Storage.head(asset.objectKey)
  if (!head.size || head.size > MAX_MEDIA_BYTES || head.size !== asset.fileSize || !hasValidMediaSignature(asset.mimeType, head.bytes)) {
    await db.update(mediaAssets).set({ status: 'failed', updatedAt: new Date() }).where(eq(mediaAssets.id, assetId))
    throw new Error('Uploaded file failed validation')
  }
  const [updated] = await db.update(mediaAssets).set({ status: 'ready', updatedAt: new Date() }).where(eq(mediaAssets.id, assetId)).returning()
  return updated
}

export async function authorizedMediaUrl(userId: string, assetId: string) {
  const asset = await db.query.mediaAssets.findFirst({
    where: and(
      eq(mediaAssets.id, assetId),
      eq(mediaAssets.status, 'ready'),
      or(eq(mediaAssets.ownerId, userId), sql`exists (select 1 from media_note_refs ref left join session_notes sn on sn.id = ref.session_note_id left join unit_notes un on un.id = ref.unit_note_id where ref.asset_id = ${mediaAssets.id} and (sn.user_id = ${userId} or un.user_id = ${userId}))`, sql`exists (select 1 from media_snapshot_refs msr join unit_content_imports uci on uci.shared_content_id = msr.shared_content_id join session_shares ss on ss.id = uci.share_id where msr.asset_id = ${mediaAssets.id} and uci.user_id = ${userId} and ss.status = 'imported')`),
    ),
  })
  if (!asset) return null
  return b2Storage.getUrl(asset.objectKey)
}

export async function syncSessionNoteMedia(ownerId: string, noteId: string, content: string) {
  const note = await db.query.sessionNotes.findFirst({ where: and(eq(sessionNotes.id, noteId), eq(sessionNotes.userId, ownerId)) }); if (!note) return
  const ids = [...new Set(idsFromHtml(content))]
  if (ids.length) { const assets = await db.query.mediaAssets.findMany({ where: and(eq(mediaAssets.ownerId, ownerId), eq(mediaAssets.status, 'ready'), inArray(mediaAssets.id, ids)) }); for (const [position, asset] of assets.entries()) await db.insert(mediaNoteRefs).values({ assetId: asset.id, sessionNoteId: noteId, position }).onConflictDoNothing() }
  await db.delete(mediaNoteRefs).where(and(eq(mediaNoteRefs.sessionNoteId, noteId), ids.length ? sql`asset_id not in (${sql.join(ids.map((id) => sql`${id}::uuid`), sql`, `)})` : sql`true`))
}

export async function getSubjectGallery(ownerId: string, subjectId: string) {
  const subject = await db.query.subjects.findFirst({ where: and(eq(subjects.id, subjectId), eq(subjects.userId, ownerId)), with: { units: { orderBy: (table, { asc }) => [asc(table.position)] } } }); if (!subject) return null
  const rows = await db.select({ asset: mediaAssets, ref: mediaNoteRefs, sessionNote: sessionNotes, unitNote: unitNotes, sessionId: studySessions.id, unitId: units.id, unitName: units.name, unitNumber: units.unitNumber, subjectId: subjects.id }).from(mediaNoteRefs).innerJoin(mediaAssets, eq(mediaAssets.id, mediaNoteRefs.assetId)).leftJoin(sessionNotes, eq(sessionNotes.id, mediaNoteRefs.sessionNoteId)).leftJoin(unitNotes, eq(unitNotes.id, mediaNoteRefs.unitNoteId)).leftJoin(studySessions, eq(studySessions.id, sessionNotes.sessionId)).leftJoin(unitActivities, eq(unitActivities.id, studySessions.activityId)).leftJoin(units, or(eq(units.id, unitActivities.unitId), eq(units.id, unitNotes.unitId))).innerJoin(subjects, eq(subjects.id, units.subjectId)).where(and(eq(subjects.id, subjectId), eq(mediaAssets.ownerId, ownerId), eq(mediaAssets.status, 'ready'), inArray(mediaAssets.mimeType, [...IMAGE_TYPES])))
  return { subject: { id: subject.id, name: subject.name }, units: subject.units.map((unit) => ({ ...unit, items: rows.filter((row) => row.unitId === unit.id).map((row) => ({ id: row.asset.id, filename: row.asset.originalFilename, mimeType: row.asset.mimeType, width: row.asset.width, height: row.asset.height, caption: row.ref.caption, noteTitle: row.sessionNote?.title ?? row.unitNote?.title ?? 'Untitled note', sessionId: row.sessionId, noteId: row.sessionNote?.id ?? row.unitNote?.id ?? null })) })) }
}

export async function cleanupOrphanMedia(maxAgeHours = 1) {
  const cutoff = new Date(Date.now() - maxAgeHours * 60 * 60 * 1000)
  const candidates = await db.query.mediaAssets.findMany({ where: and(inArray(mediaAssets.status, ['pending', 'failed', 'ready']), lt(mediaAssets.updatedAt, cutoff), sql`not exists (select 1 from media_note_refs where media_note_refs.asset_id = ${mediaAssets.id}) and not exists (select 1 from media_snapshot_refs where media_snapshot_refs.asset_id = ${mediaAssets.id})`) })
  for (const candidate of candidates) {
    try {
      await db.transaction(async (tx) => {
        const [asset] = await tx.select().from(mediaAssets).where(and(eq(mediaAssets.id, candidate.id), inArray(mediaAssets.status, ['pending', 'failed', 'ready']), lt(mediaAssets.updatedAt, cutoff), sql`not exists (select 1 from media_note_refs where media_note_refs.asset_id = ${mediaAssets.id}) and not exists (select 1 from media_snapshot_refs where media_snapshot_refs.asset_id = ${mediaAssets.id})`)).for('update')
        if (!asset) return
        await b2Storage.remove(asset.objectKey)
        await tx.delete(mediaAssets).where(eq(mediaAssets.id, asset.id))
      })
    } catch { /* B2 and database failures are retried by the next cleanup run. */ }
  }
}
