import { db } from '@/db'
import { studySessions } from '@/db/schema/study-sessions'
import { sessionNotes, knowledgeLinks, sessionKeywords } from '@/db/schema/knowledge'
import { unitActivities } from '@/db/schema/activities'
import { subjects } from '@/db/schema/subjects'
import { units } from '@/db/schema/units'
import { unitNotes, unitLinks, unitKeywords } from '@/db/schema/unit-knowledge'
import { and, asc, eq } from 'drizzle-orm'

async function ownedSession(userId: string, sessionId: string) {
  return db.query.studySessions.findFirst({
    where: and(eq(studySessions.id, sessionId), eq(studySessions.userId, userId)),
    with: { activity: { with: { unit: { with: { subject: true } } } } },
  })
}

export async function getSessionWorkspace(userId: string, sessionId: string) {
  const session = await ownedSession(userId, sessionId)
  if (!session) return null
  const relatedSessions = await db.query.studySessions.findMany({ where: eq(studySessions.userId, userId), with: { activity: { with: { unit: { with: { subject: true } } } } }, orderBy: (table, { desc }) => [desc(table.scheduledDate)] })
  const unitSessions = relatedSessions.filter((item) => item.id !== sessionId && item.activity?.unit.id === session.activity?.unit.id)
  const relatedIds = unitSessions.map((item) => item.id)
  const relatedNotes = relatedIds.length ? await db.query.sessionNotes.findMany({ where: eq(sessionNotes.userId, userId) }) : []
  const [note, links, keywords] = await Promise.all([
    db.query.sessionNotes.findFirst({ where: eq(sessionNotes.sessionId, sessionId) }),
    db.query.knowledgeLinks.findMany({ where: eq(knowledgeLinks.sessionId, sessionId), orderBy: [asc(knowledgeLinks.createdAt)] }),
    db.query.sessionKeywords.findMany({ where: eq(sessionKeywords.sessionId, sessionId), orderBy: [asc(sessionKeywords.createdAt)] }),
  ])
  const sameActivity = unitSessions.filter((item) => item.activity?.id === session.activity?.id)
  return { session, note: note ?? { id: null, title: 'Untitled note', content: '' }, links, keywords, previous: sameActivity[0] ? { session: sameActivity[0], note: relatedNotes.find((item) => item.sessionId === sameActivity[0].id) ?? null } : null, related: unitSessions.filter((item) => item.activity?.id !== session.activity?.id).slice(0, 4).map((item) => ({ session: item, note: relatedNotes.find((note) => note.sessionId === item.id) ?? null })) }
}

export async function saveSessionNote(userId: string, sessionId: string, title: string, content: string) {
  if (!(await ownedSession(userId, sessionId))) throw new Error('Session not found')
  const [note] = await db.insert(sessionNotes).values({ sessionId, userId, title: title.trim() || 'Untitled note', content }).onConflictDoUpdate({
    target: sessionNotes.sessionId,
    set: { title: title.trim() || 'Untitled note', content, updatedAt: new Date() },
  }).returning()
  return note
}

export async function addSessionLink(userId: string, sessionId: string, data: { url: string; nickname: string; category: string }) {
  if (!(await ownedSession(userId, sessionId))) throw new Error('Session not found')
  const [link] = await db.insert(knowledgeLinks).values({ sessionId, userId, ...data }).returning()
  return link
}

export async function removeSessionLink(userId: string, linkId: string) {
  const [link] = await db.delete(knowledgeLinks).where(and(eq(knowledgeLinks.id, linkId), eq(knowledgeLinks.userId, userId))).returning()
  if (!link) throw new Error('Link not found')
}

export async function addSessionKeyword(userId: string, sessionId: string, keyword: string) {
  if (!(await ownedSession(userId, sessionId))) throw new Error('Session not found')
  const clean = keyword.trim().slice(0, 100)
  if (!clean) throw new Error('Keyword is required')
  const [result] = await db.insert(sessionKeywords).values({ sessionId, userId, keyword: clean }).onConflictDoNothing().returning()
  return result ?? db.query.sessionKeywords.findFirst({ where: and(eq(sessionKeywords.sessionId, sessionId), eq(sessionKeywords.keyword, clean)) })
}

export async function removeSessionKeyword(userId: string, keywordId: string) {
  const [keyword] = await db.delete(sessionKeywords).where(and(eq(sessionKeywords.id, keywordId), eq(sessionKeywords.userId, userId))).returning()
  if (!keyword) throw new Error('Keyword not found')
}

export async function getSubjectKnowledge(userId: string, subjectId: string) {
  const subject = await db.query.subjects.findFirst({ where: and(eq(subjects.id, subjectId), eq(subjects.userId, userId)), with: { units: { orderBy: (table, { asc }) => [asc(table.position)] } } })
  if (!subject) return null
  const result = await Promise.all(subject.units.map(async (unit) => {
    const baseWhere = and(eq(studySessions.userId, userId), eq(unitActivities.unitId, unit.id))
    const [notes, links, keywords] = await Promise.all([
      db.select({ id: sessionNotes.id, title: sessionNotes.title, content: sessionNotes.content, sessionId: studySessions.id, activityType: unitActivities.activityType, scheduledDate: studySessions.scheduledDate })
        .from(sessionNotes).innerJoin(studySessions, eq(sessionNotes.sessionId, studySessions.id)).innerJoin(unitActivities, eq(studySessions.activityId, unitActivities.id)).where(baseWhere),
      db.select({ id: knowledgeLinks.id, nickname: knowledgeLinks.nickname, url: knowledgeLinks.url, category: knowledgeLinks.category, sessionId: studySessions.id })
        .from(knowledgeLinks).innerJoin(studySessions, eq(knowledgeLinks.sessionId, studySessions.id)).innerJoin(unitActivities, eq(studySessions.activityId, unitActivities.id)).where(baseWhere),
      db.select({ id: sessionKeywords.id, keyword: sessionKeywords.keyword, sessionId: studySessions.id })
        .from(sessionKeywords).innerJoin(studySessions, eq(sessionKeywords.sessionId, studySessions.id)).innerJoin(unitActivities, eq(studySessions.activityId, unitActivities.id)).where(baseWhere),
    ])
    const [unitOwnedNotes, unitOwnedLinks, unitOwnedKeywords] = await Promise.all([
      db.query.unitNotes.findMany({ where: and(eq(unitNotes.userId, userId), eq(unitNotes.unitId, unit.id)), orderBy: (table, { desc }) => [desc(table.updatedAt)] }),
      db.query.unitLinks.findMany({ where: and(eq(unitLinks.userId, userId), eq(unitLinks.unitId, unit.id)) }),
      db.query.unitKeywords.findMany({ where: and(eq(unitKeywords.userId, userId), eq(unitKeywords.unitId, unit.id)) }),
    ])
    return { ...unit, notes: [...unitOwnedNotes.map((item) => ({ ...item, source: 'unit' as const })), ...notes.map((item) => ({ ...item, source: 'session' as const }))], links: [...unitOwnedLinks.map((item) => ({ ...item, source: 'unit' as const })), ...links.map((item) => ({ ...item, source: 'session' as const }))], keywords: [...unitOwnedKeywords.map((item) => ({ ...item, source: 'unit' as const })), ...keywords.map((item) => ({ ...item, source: 'session' as const }))] }
  }))
  return { ...subject, units: result }
}

export async function getUnitKnowledge(userId: string, unitId: string) {
  const unit = await db.query.units.findFirst({ where: and(eq(units.id, unitId)), with: { subject: true, unitActivities: true } })
  if (!unit || unit.subject.userId !== userId) return null
  const [ownedNotes, ownedLinks, ownedKeywords] = await Promise.all([
    db.query.unitNotes.findMany({ where: and(eq(unitNotes.userId, userId), eq(unitNotes.unitId, unitId)) }),
    db.query.unitLinks.findMany({ where: and(eq(unitLinks.userId, userId), eq(unitLinks.unitId, unitId)) }),
    db.query.unitKeywords.findMany({ where: and(eq(unitKeywords.userId, userId), eq(unitKeywords.unitId, unitId)) }),
  ])
  const allSessions = await db.query.studySessions.findMany({ where: and(eq(studySessions.userId, userId)), with: { activity: { with: { unit: true } } }, orderBy: (table, { desc }) => [desc(table.scheduledDate)] })
  const unitSessions = allSessions.filter((session) => session.activity?.unit.id === unitId)
  const sessionIds = unitSessions.map((session) => session.id)
  const [notes, links, keywords] = await Promise.all([
    sessionIds.length ? db.query.sessionNotes.findMany({ where: eq(sessionNotes.userId, userId) }) : Promise.resolve([]),
    sessionIds.length ? db.query.knowledgeLinks.findMany({ where: eq(knowledgeLinks.userId, userId) }) : Promise.resolve([]),
    sessionIds.length ? db.query.sessionKeywords.findMany({ where: eq(sessionKeywords.userId, userId) }) : Promise.resolve([]),
  ])
  return { unit, sessions: unitSessions, notes: [...ownedNotes.map((item) => ({ ...item, source: 'unit' as const })), ...notes.filter((item) => sessionIds.includes(item.sessionId)).map((item) => ({ ...item, source: 'session' as const }))], links: [...ownedLinks.map((item) => ({ ...item, source: 'unit' as const })), ...links.filter((item) => sessionIds.includes(item.sessionId)).map((item) => ({ ...item, source: 'session' as const }))], keywords: [...ownedKeywords.map((item) => ({ ...item, source: 'unit' as const })), ...keywords.filter((item) => sessionIds.includes(item.sessionId)).map((item) => ({ ...item, source: 'session' as const }))] }
}

export async function addUnitNote(userId: string, unitId: string, title: string, content: string) {
  const unit = await db.query.units.findFirst({ where: eq(units.id, unitId), with: { subject: true } }); if (!unit || unit.subject.userId !== userId) throw new Error('Unit not found')
  const [note] = await db.insert(unitNotes).values({ userId, unitId, title: title.trim() || 'Untitled note', content }).returning(); return note
}
export async function addUnitLink(userId: string, unitId: string, data: { url: string; nickname: string; category: string }) {
  const unit = await db.query.units.findFirst({ where: eq(units.id, unitId), with: { subject: true } }); if (!unit || unit.subject.userId !== userId) throw new Error('Unit not found')
  const [link] = await db.insert(unitLinks).values({ userId, unitId, ...data }).returning(); return link
}
export async function addUnitKeyword(userId: string, unitId: string, keyword: string) {
  const unit = await db.query.units.findFirst({ where: eq(units.id, unitId), with: { subject: true } }); if (!unit || unit.subject.userId !== userId) throw new Error('Unit not found')
  const [item] = await db.insert(unitKeywords).values({ userId, unitId, keyword: keyword.trim() }).onConflictDoNothing().returning(); return item
}
