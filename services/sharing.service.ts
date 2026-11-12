import 'server-only'

import { createHash, randomBytes } from 'crypto'
import { and, asc, desc, eq, gt, isNull, lt, or, sql } from 'drizzle-orm'
import { hashPassword, verifyPassword } from '@/lib/auth/password'
import { db } from '@/db'
import { users } from '@/db/schema/users'
import { studySessions } from '@/db/schema/study-sessions'
import { sessionNotes, knowledgeLinks, sessionKeywords } from '@/db/schema/knowledge'
import { subjects } from '@/db/schema/subjects'
import { units } from '@/db/schema/units'
import { sharedContent, sessionShares, unitContentImports, externalShares, externalShareSessions, type SharedContentSnapshot } from '@/db/schema/sharing'
import { invalidateUserCaches } from '@/lib/redis/invalidation'

const EXPIRY_DAYS = 30
const EXTERNAL_SESSION_HOURS = 8

function canonicalSnapshot(snapshot: SharedContentSnapshot) {
  return JSON.stringify({
    title: snapshot.title,
    note: snapshot.note,
    links: [...snapshot.links].sort((a, b) => `${a.url}:${a.nickname}`.localeCompare(`${b.url}:${b.nickname}`)),
    keywords: [...snapshot.keywords].sort(),
  })
}

function snapshotHash(snapshot: SharedContentSnapshot) {
  return createHash('sha256').update(canonicalSnapshot(snapshot)).digest('hex')
}

function sanitizeExternalHtml(value: string) {
  return value
    .replace(/<\/?(script|style|iframe|object|embed|svg)[^>]*>/gi, '')
    .replace(/\s+on[a-z]+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, '')
    .replace(/\s+(?:href|src)\s*=\s*(["'])\s*javascript:[^"']*\1/gi, '')
    .replace(/\s+(?:href|src)\s*=\s*javascript:[^\s>]+/gi, '')
}

function safeExternalUrl(value: string) {
  try {
    const url = new URL(value)
    return url.protocol === 'http:' || url.protocol === 'https:' ? value : ''
  } catch { return '' }
}

function activeStatus(status: typeof sessionShares.$inferSelect.status) {
  return status === 'pending' || status === 'imported'
}

async function expireShares(userId?: string) {
  const now = new Date()
  await db.update(sessionShares).set({ status: 'expired', respondedAt: now }).where(and(
    eq(sessionShares.status, 'pending'),
    lt(sessionShares.expiresAt, now),
    userId ? eq(sessionShares.recipientUserId, userId) : undefined,
  ))
}

async function getOrCreateSnapshot(snapshot: SharedContentSnapshot) {
  const hash = snapshotHash(snapshot)
  await db.insert(sharedContent).values({ contentHash: hash, content: snapshot }).onConflictDoNothing({ target: sharedContent.contentHash })
  return (await db.query.sharedContent.findFirst({ where: eq(sharedContent.contentHash, hash) }))!
}

export async function createSessionShare(senderUserId: string, sessionId: string, email: string, recipientUserId?: string) {
  const normalizedEmail = email.trim().toLowerCase()
  if (recipientUserId && !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(recipientUserId)) throw new Error('Invalid recipient')
  if (!recipientUserId && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) throw new Error('Enter a valid email address')
  const [recipient, session] = await Promise.all([
    db.query.users.findFirst({ where: recipientUserId ? eq(users.id, recipientUserId) : eq(users.email, normalizedEmail), columns: { id: true, name: true, email: true } }),
    db.query.studySessions.findFirst({ where: and(eq(studySessions.id, sessionId), eq(studySessions.userId, senderUserId)), with: { activity: { with: { unit: true } } } }),
  ])
  if (!session) throw new Error('Session not found')
  if (!recipient) throw new Error('That email is not registered for ExamOS')
  if (recipient.id === senderUserId) throw new Error('You cannot share a session with yourself')

  const [note, links, keywords] = await Promise.all([
    db.query.sessionNotes.findFirst({ where: eq(sessionNotes.sessionId, sessionId), columns: { title: true, content: true } }),
    db.query.knowledgeLinks.findMany({ where: eq(knowledgeLinks.sessionId, sessionId), orderBy: [asc(knowledgeLinks.createdAt)], columns: { url: true, nickname: true, category: true } }),
    db.query.sessionKeywords.findMany({ where: eq(sessionKeywords.sessionId, sessionId), orderBy: [asc(sessionKeywords.createdAt)], columns: { keyword: true } }),
  ])
  const snapshot: SharedContentSnapshot = {
    title: note?.title || `Session ${session.scheduledDate}`,
    note: note ? { title: note.title, content: note.content } : null,
    links,
    keywords: keywords.map((item) => item.keyword),
  }
  const content = await getOrCreateSnapshot(snapshot)
  await expireShares()
  const duplicate = await db.query.sessionShares.findFirst({ where: and(
    eq(sessionShares.senderUserId, senderUserId),
    eq(sessionShares.recipientUserId, recipient.id),
    eq(sessionShares.sharedContentId, content.id),
    or(eq(sessionShares.status, 'pending'), eq(sessionShares.status, 'imported')),
  ) })
  if (duplicate && activeStatus(duplicate.status)) throw new Error('This session is already shared with that user')

  const [share] = await db.insert(sessionShares).values({
    senderUserId, recipientUserId: recipient.id, sharedContentId: content.id, originalSessionId: sessionId,
    expiresAt: new Date(Date.now() + EXPIRY_DAYS * 24 * 60 * 60 * 1000),
  }).returning({ id: sessionShares.id })
  await invalidateUserCaches({ userId: senderUserId })
  return { id: share.id, recipient: { email: recipient.email, name: recipient.name } }
}

export async function getShareBox(userId: string) {
  await expireShares(userId)
  const [received, sent] = await Promise.all([
    db.select({ id: sessionShares.id, status: sessionShares.status, createdAt: sessionShares.createdAt, expiresAt: sessionShares.expiresAt, senderName: users.name, senderEmail: users.email, title: sharedContent.content, sharedContentId: sharedContent.id, importId: unitContentImports.id })
      .from(sessionShares).innerJoin(users, eq(users.id, sessionShares.senderUserId)).innerJoin(sharedContent, eq(sharedContent.id, sessionShares.sharedContentId)).leftJoin(unitContentImports, eq(unitContentImports.shareId, sessionShares.id))
      .where(eq(sessionShares.recipientUserId, userId)).orderBy(desc(sessionShares.createdAt)),
    db.select({ id: sessionShares.id, status: sessionShares.status, createdAt: sessionShares.createdAt, expiresAt: sessionShares.expiresAt, recipientName: users.name, recipientEmail: users.email, title: sharedContent.content })
      .from(sessionShares).innerJoin(users, eq(users.id, sessionShares.recipientUserId)).innerJoin(sharedContent, eq(sharedContent.id, sessionShares.sharedContentId))
      .where(eq(sessionShares.senderUserId, userId)).orderBy(desc(sessionShares.createdAt)),
  ])
  return {
    received: received.map((item) => ({ ...item, content: item.title, title: undefined })),
    sent: sent.map((item) => ({ ...item, content: item.title, title: undefined })),
  }
}

export async function getRecipientDestinations(userId: string) {
  return db.query.subjects.findMany({ where: eq(subjects.userId, userId), with: { units: { orderBy: (table, { asc }) => [asc(table.position)] } }, orderBy: (table, { asc }) => [asc(table.position)] })
}

export async function acceptShare(userId: string, shareId: string, subjectId: string, unitId: string) {
  const result = await db.transaction(async (tx) => {
    const share = await tx.query.sessionShares.findFirst({ where: and(eq(sessionShares.id, shareId), eq(sessionShares.recipientUserId, userId)) })
    if (!share) throw new Error('Invitation not found')
    if (share.status !== 'pending') throw new Error('This invitation is no longer available')
    if (share.expiresAt <= new Date()) {
      await tx.update(sessionShares).set({ status: 'expired', respondedAt: new Date() }).where(eq(sessionShares.id, shareId))
      throw new Error('This invitation has expired')
    }
    const destination = await tx.query.units.findFirst({ where: and(eq(units.id, unitId), eq(units.subjectId, subjectId)), with: { subject: true } })
    if (!destination || destination.subject.userId !== userId) throw new Error('That destination unit is not yours')
    const [imported] = await tx.insert(unitContentImports).values({ shareId, userId, subjectId, unitId, sharedContentId: share.sharedContentId }).onConflictDoNothing({ target: unitContentImports.shareId }).returning()
    if (!imported) throw new Error('This invitation has already been imported')
    await tx.update(sessionShares).set({ status: 'imported', respondedAt: new Date() }).where(and(eq(sessionShares.id, shareId), eq(sessionShares.status, 'pending')))
    return imported
  })
  await invalidateUserCaches({ userId })
  return result
}

export async function declineShare(userId: string, shareId: string) {
  const [share] = await db.update(sessionShares).set({ status: 'declined', respondedAt: new Date() }).where(and(eq(sessionShares.id, shareId), eq(sessionShares.recipientUserId, userId), eq(sessionShares.status, 'pending'))).returning({ id: sessionShares.id })
  if (!share) throw new Error('Invitation not found or no longer pending')
}

export async function revokeShare(senderUserId: string, shareId: string) {
  let recipientUserId: string | undefined
  await db.transaction(async (tx) => {
    const share = await tx.query.sessionShares.findFirst({ where: and(eq(sessionShares.id, shareId), eq(sessionShares.senderUserId, senderUserId)) })
    if (!share || !activeStatus(share.status)) throw new Error('Share not found or already inactive')
    recipientUserId = share.recipientUserId
    await tx.delete(unitContentImports).where(eq(unitContentImports.shareId, shareId))
    await tx.update(sessionShares).set({ status: 'revoked', revokedAt: new Date(), respondedAt: share.respondedAt ?? new Date() }).where(eq(sessionShares.id, shareId))
  })
  await invalidateUserCaches({ userId: senderUserId })
  if (recipientUserId) await invalidateUserCaches({ userId: recipientUserId })
}

export async function removeImport(userId: string, importId: string) {
  const [removed] = await db.delete(unitContentImports).where(and(eq(unitContentImports.id, importId), eq(unitContentImports.userId, userId))).returning({ id: unitContentImports.id })
  if (!removed) throw new Error('Shared material not found')
  await invalidateUserCaches({ userId })
}

export async function getSharedImportWorkspace(userId: string, importId: string) {
  const [item] = await db.select({
    importId: unitContentImports.id, createdAt: unitContentImports.createdAt, status: sessionShares.status,
    content: sharedContent.content, senderName: users.name, senderEmail: users.email,
    unitId: units.id, unitName: units.name, unitNumber: units.unitNumber,
    subjectId: subjects.id, subjectName: subjects.name,
  }).from(unitContentImports)
    .innerJoin(sessionShares, eq(sessionShares.id, unitContentImports.shareId))
    .innerJoin(sharedContent, eq(sharedContent.id, unitContentImports.sharedContentId))
    .innerJoin(users, eq(users.id, sessionShares.senderUserId))
    .innerJoin(units, eq(units.id, unitContentImports.unitId))
    .innerJoin(subjects, eq(subjects.id, unitContentImports.subjectId))
    .where(and(eq(unitContentImports.id, importId), eq(unitContentImports.userId, userId), eq(sessionShares.status, 'imported')))
    .limit(1)
  if (!item) return null
  const content = item.content
  return {
    session: { id: item.importId, scheduledDate: item.createdAt.toISOString().slice(0, 10), activity: { activityType: 'shared', unit: { id: item.unitId, name: item.unitName, unitNumber: item.unitNumber, subject: { id: item.subjectId, name: item.subjectName } } } },
    note: { id: null, title: content.note?.title || content.title, content: content.note?.content || '' },
    links: content.links.map((link, index) => ({ id: `${item.importId}-link-${index}`, ...link })),
    keywords: content.keywords.map((keyword, index) => ({ id: `${item.importId}-keyword-${index}`, keyword })),
    previous: null, related: [], sharedBy: item.senderName || item.senderEmail,
  }
}

export async function getUnitSharedContent(userId: string, unitId: string) {
  return db.select({ importId: unitContentImports.id, createdAt: unitContentImports.createdAt, senderName: users.name, senderEmail: users.email, content: sharedContent.content, shareId: sessionShares.id, shareStatus: sessionShares.status })
    .from(unitContentImports).innerJoin(sessionShares, eq(sessionShares.id, unitContentImports.shareId)).innerJoin(users, eq(users.id, sessionShares.senderUserId)).innerJoin(sharedContent, eq(sharedContent.id, unitContentImports.sharedContentId))
    .where(and(eq(unitContentImports.userId, userId), eq(unitContentImports.unitId, unitId), eq(sessionShares.status, 'imported')))
}

export async function cleanupUnusedSnapshots() {
  const cutoff = new Date(Date.now() - EXPIRY_DAYS * 24 * 60 * 60 * 1000)
  await db.transaction(async (tx) => {
    await tx.delete(sessionShares).where(and(
      lt(sessionShares.createdAt, cutoff),
      or(eq(sessionShares.status, 'declined'), eq(sessionShares.status, 'revoked'), eq(sessionShares.status, 'expired')),
    ))
    await tx.delete(sharedContent).where(and(
      lt(sharedContent.createdAt, cutoff),
      sql`not exists (select 1 from session_shares where session_shares.shared_content_id = ${sharedContent.id})`,
      sql`not exists (select 1 from unit_content_imports where unit_content_imports.shared_content_id = ${sharedContent.id})`,
    ))
  })
}

function hashSecret(value: string) { return createHash('sha256').update(value).digest('hex') }

async function snapshotForOwner(ownerUserId: string, sessionId: string) {
  const session = await db.query.studySessions.findFirst({ where: and(eq(studySessions.id, sessionId), eq(studySessions.userId, ownerUserId)), with: { activity: { with: { unit: true } } } })
  if (!session) throw new Error('Session not found')
  const [note, links, keywords] = await Promise.all([
    db.query.sessionNotes.findFirst({ where: eq(sessionNotes.sessionId, sessionId), columns: { title: true, content: true } }),
    db.query.knowledgeLinks.findMany({ where: eq(knowledgeLinks.sessionId, sessionId), orderBy: [asc(knowledgeLinks.createdAt)], columns: { url: true, nickname: true, category: true } }),
    db.query.sessionKeywords.findMany({ where: eq(sessionKeywords.sessionId, sessionId), orderBy: [asc(sessionKeywords.createdAt)], columns: { keyword: true } }),
  ])
  return { session, snapshot: { title: note?.title || `Session ${session.scheduledDate}`, note: note ? { title: note.title, content: sanitizeExternalHtml(note.content) } : null, links: links.filter((link) => safeExternalUrl(link.url)).map((link) => ({ ...link, url: safeExternalUrl(link.url) })), keywords: keywords.map((item) => item.keyword) } satisfies SharedContentSnapshot }
}

export async function createExternalShare(ownerUserId: string, sessionId: string, passcode: string, expiresAt?: string | null) {
  if (!/^[A-Za-z0-9]{6,128}$/.test(passcode)) throw new Error('Passcodes must be 6–128 letters or numbers')
  const expiry = expiresAt ? new Date(expiresAt) : null
  if (expiry && (!Number.isFinite(expiry.getTime()) || expiry <= new Date())) throw new Error('Expiry must be in the future')
  const { snapshot } = await snapshotForOwner(ownerUserId, sessionId)
  const content = await getOrCreateSnapshot(snapshot)
  const token = randomBytes(32).toString('base64url')
  const [share] = await db.insert(externalShares).values({ ownerUserId, originalSessionId: sessionId, sharedContentId: content.id, tokenHash: hashSecret(token), passcodeHash: await hashPassword(passcode), expiresAt: expiry }).returning({ id: externalShares.id, expiresAt: externalShares.expiresAt })
  return { id: share.id, token, expiresAt: share.expiresAt }
}

export async function listExternalShares(ownerUserId: string, sessionId: string) {
  return db.select({ id: externalShares.id, sessionId: externalShares.originalSessionId, createdAt: externalShares.createdAt, updatedAt: externalShares.updatedAt, expiresAt: externalShares.expiresAt, revokedAt: externalShares.revokedAt, snapshotId: externalShares.sharedContentId })
    .from(externalShares).where(and(eq(externalShares.ownerUserId, ownerUserId), eq(externalShares.originalSessionId, sessionId))).orderBy(desc(externalShares.createdAt))
}

export async function updateExternalShare(ownerUserId: string, shareId: string) {
  const share = await db.query.externalShares.findFirst({ where: and(eq(externalShares.id, shareId), eq(externalShares.ownerUserId, ownerUserId), isNull(externalShares.revokedAt)) })
  if (!share) throw new Error('External share not found')
  const { snapshot } = await snapshotForOwner(ownerUserId, share.originalSessionId)
  const content = await getOrCreateSnapshot(snapshot)
  await db.update(externalShares).set({ sharedContentId: content.id, updatedAt: new Date() }).where(eq(externalShares.id, shareId))
}

export async function revokeExternalShare(ownerUserId: string, shareId: string, remove = false) {
  const where = and(eq(externalShares.id, shareId), eq(externalShares.ownerUserId, ownerUserId))
  const result = remove ? await db.delete(externalShares).where(where).returning({ id: externalShares.id }) : await db.update(externalShares).set({ revokedAt: new Date(), updatedAt: new Date() }).where(where).returning({ id: externalShares.id })
  if (!result.length) throw new Error('External share not found')
}

export async function getExternalShare(token: string) {
  if (!/^[A-Za-z0-9_-]{32,}$/.test(token)) return null
  const [share] = await db.select({ id: externalShares.id, passcodeHash: externalShares.passcodeHash, expiresAt: externalShares.expiresAt, content: sharedContent.content })
    .from(externalShares).innerJoin(sharedContent, eq(sharedContent.id, externalShares.sharedContentId))
    .where(and(eq(externalShares.tokenHash, hashSecret(token)), isNull(externalShares.revokedAt))).limit(1)
  if (!share || (share.expiresAt && share.expiresAt <= new Date())) return null
  return share
}

export async function verifyExternalShare(token: string, passcode: string) {
  const share = await getExternalShare(token)
  if (!share || !(await verifyPassword(share.passcodeHash, passcode))) return null
  const sessionToken = randomBytes(32).toString('base64url')
  await db.insert(externalShareSessions).values({ shareId: share.id, sessionHash: hashSecret(sessionToken), expiresAt: new Date(Date.now() + EXTERNAL_SESSION_HOURS * 60 * 60 * 1000) })
  return { shareId: share.id, sessionToken }
}

export async function getExternalSnapshot(token: string, sessionToken: string | undefined) {
  if (!sessionToken) return null
  const share = await getExternalShare(token)
  if (!share) return null
  const session = await db.query.externalShareSessions.findFirst({ where: and(eq(externalShareSessions.shareId, share.id), eq(externalShareSessions.sessionHash, hashSecret(sessionToken)), gt(externalShareSessions.expiresAt, new Date())) })
  return session ? share.content : null
}

export async function cleanupExternalShareSessions() {
  await db.delete(externalShareSessions).where(lt(externalShareSessions.expiresAt, new Date()))
}
