import { db } from '@/db'
import { sessionNotes, knowledgeLinks, sessionKeywords } from '@/db/schema/knowledge'
import { unitNotes, unitLinks, unitKeywords } from '@/db/schema/unit-knowledge'
import { studySessions } from '@/db/schema/study-sessions'
import { unitActivities } from '@/db/schema/activities'
import { units } from '@/db/schema/units'
import { subjects } from '@/db/schema/subjects'
import { and, eq, ilike, or } from 'drizzle-orm'

export async function searchKnowledge(userId: string, rawQuery: string) {
  const query = rawQuery.trim().slice(0, 100)
  if (!query) return []
  const pattern = `%${query}%`
  const [notes, links, keywords, unitNotesFound, unitLinksFound, unitKeywordsFound] = await Promise.all([
    db.select({ id: sessionNotes.id, title: sessionNotes.title, content: sessionNotes.content, sessionId: studySessions.id, subjectName: subjects.name, unitName: units.name, activityType: unitActivities.activityType })
      .from(sessionNotes).innerJoin(studySessions, eq(sessionNotes.sessionId, studySessions.id)).innerJoin(unitActivities, eq(studySessions.activityId, unitActivities.id)).innerJoin(units, eq(unitActivities.unitId, units.id)).innerJoin(subjects, eq(units.subjectId, subjects.id)).where(and(eq(sessionNotes.userId, userId), or(ilike(sessionNotes.title, pattern), ilike(sessionNotes.content, pattern)))).limit(10),
    db.select({ id: knowledgeLinks.id, nickname: knowledgeLinks.nickname, url: knowledgeLinks.url, category: knowledgeLinks.category, sessionId: studySessions.id, subjectName: subjects.name, unitName: units.name })
      .from(knowledgeLinks).innerJoin(studySessions, eq(knowledgeLinks.sessionId, studySessions.id)).innerJoin(unitActivities, eq(studySessions.activityId, unitActivities.id)).innerJoin(units, eq(unitActivities.unitId, units.id)).innerJoin(subjects, eq(units.subjectId, subjects.id)).where(and(eq(knowledgeLinks.userId, userId), or(ilike(knowledgeLinks.nickname, pattern), ilike(knowledgeLinks.url, pattern), ilike(knowledgeLinks.category, pattern)))).limit(10),
    db.select({ id: sessionKeywords.id, keyword: sessionKeywords.keyword, sessionId: studySessions.id, subjectName: subjects.name, unitName: units.name })
      .from(sessionKeywords).innerJoin(studySessions, eq(sessionKeywords.sessionId, studySessions.id)).innerJoin(unitActivities, eq(studySessions.activityId, unitActivities.id)).innerJoin(units, eq(unitActivities.unitId, units.id)).innerJoin(subjects, eq(units.subjectId, subjects.id)).where(and(eq(sessionKeywords.userId, userId), ilike(sessionKeywords.keyword, pattern))).limit(10),
    db.select({ id: unitNotes.id, title: unitNotes.title, content: unitNotes.content, unitId: units.id, subjectName: subjects.name, unitName: units.name }).from(unitNotes).innerJoin(units, eq(unitNotes.unitId, units.id)).innerJoin(subjects, eq(units.subjectId, subjects.id)).where(and(eq(unitNotes.userId, userId), or(ilike(unitNotes.title, pattern), ilike(unitNotes.content, pattern)))).limit(10),
    db.select({ id: unitLinks.id, nickname: unitLinks.nickname, url: unitLinks.url, category: unitLinks.category, unitId: units.id, subjectName: subjects.name, unitName: units.name }).from(unitLinks).innerJoin(units, eq(unitLinks.unitId, units.id)).innerJoin(subjects, eq(units.subjectId, subjects.id)).where(and(eq(unitLinks.userId, userId), or(ilike(unitLinks.nickname, pattern), ilike(unitLinks.url, pattern), ilike(unitLinks.category, pattern)))).limit(10),
    db.select({ id: unitKeywords.id, keyword: unitKeywords.keyword, unitId: units.id, subjectName: subjects.name, unitName: units.name }).from(unitKeywords).innerJoin(units, eq(unitKeywords.unitId, units.id)).innerJoin(subjects, eq(units.subjectId, subjects.id)).where(and(eq(unitKeywords.userId, userId), ilike(unitKeywords.keyword, pattern))).limit(10),
  ])
  return [
    ...notes.map((item) => ({ id: `session-note-${item.id}`, type: 'Note', title: item.title, preview: item.content.replace(/<[^>]+>/g, '').slice(0, 100), meta: `${item.subjectName} · ${item.unitName} · ${item.activityType}`, href: `/sessions/${item.sessionId}` })),
    ...links.map((item) => ({ id: `session-link-${item.id}`, type: 'Resource', title: item.nickname, preview: item.category, meta: `${item.subjectName} · ${item.unitName}`, href: `/sessions/${item.sessionId}` })),
    ...keywords.map((item) => ({ id: `session-keyword-${item.id}`, type: 'Keyword', title: `#${item.keyword}`, preview: 'Session keyword', meta: `${item.subjectName} · ${item.unitName}`, href: `/sessions/${item.sessionId}` })),
    ...unitNotesFound.map((item) => ({ id: `unit-note-${item.id}`, type: 'Note', title: item.title, preview: item.content.replace(/<[^>]+>/g, '').slice(0, 100), meta: `${item.subjectName} · ${item.unitName} · Unit note`, href: `/units/${item.unitId}` })),
    ...unitLinksFound.map((item) => ({ id: `unit-link-${item.id}`, type: 'Resource', title: item.nickname, preview: item.category, meta: `${item.subjectName} · ${item.unitName} · Unit resource`, href: `/units/${item.unitId}` })),
    ...unitKeywordsFound.map((item) => ({ id: `unit-keyword-${item.id}`, type: 'Keyword', title: `#${item.keyword}`, preview: 'Unit keyword', meta: `${item.subjectName} · ${item.unitName}`, href: `/units/${item.unitId}` })),
  ].slice(0, 30)
}
