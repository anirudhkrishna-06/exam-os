// ============================================================
// services/session.service.ts
// CRUD and status management for individual study sessions.
// ============================================================

import { db } from '@/db'
import { studySessions } from '@/db/schema/study-sessions'
import { sessionHistory } from '@/db/schema/session-history'
import { eq, and, gte, lte, sql } from 'drizzle-orm'
import { getDailyCapacity } from './capacity.service'

// ---- Queries ----

export async function getSessionsForDate(userId: string, date: string) {
  return db.query.studySessions.findMany({
    where: and(
      eq(studySessions.userId, userId),
      eq(studySessions.scheduledDate, date),
    ),
    with: {
      activity: {
        with: {
          unit: {
            with: { subject: true },
          },
        },
      },
    },
    orderBy: (t, { asc }) => [asc(t.position)],
  })
}

export async function getSessionsForMonth(userId: string, year: number, month: number) {
  // month is 1-based
  const startDate = `${year}-${String(month).padStart(2, '0')}-01`
  const lastDay = new Date(year, month, 0).getDate()
  const endDate = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`

  const sessions = await db.query.studySessions.findMany({
    where: and(
      eq(studySessions.userId, userId),
      gte(studySessions.scheduledDate, startDate),
      lte(studySessions.scheduledDate, endDate),
    ),
    with: {
      activity: {
        with: {
          unit: {
            with: { subject: true },
          },
        },
      },
    },
  })

  // Group by date for calendar view
  const byDate = new Map<string, typeof sessions>()
  for (const s of sessions) {
    const list = byDate.get(s.scheduledDate) ?? []
    list.push(s)
    byDate.set(s.scheduledDate, list)
  }

  return Object.fromEntries(byDate)
}

export async function getSessionById(userId: string, sessionId: string) {
  return db.query.studySessions.findFirst({
    where: and(
      eq(studySessions.id, sessionId),
      eq(studySessions.userId, userId),
    ),
    with: {
      activity: {
        with: {
          unit: {
            with: { subject: true },
          },
        },
      },
    },
  })
}

export async function getSessionsForSeason(userId: string, seasonId: string) {
  return db.query.studySessions.findMany({
    where: and(
      eq(studySessions.userId, userId),
      eq(studySessions.seasonId, seasonId),
    ),
    with: {
      activity: {
        with: {
          unit: {
            with: { subject: true },
          },
        },
      },
    },
    orderBy: (t, { asc }) => [asc(t.scheduledDate), asc(t.position)],
  })
}

// ---- Status updates ----

export async function updateSessionStatus(
  userId: string,
  sessionId: string,
  newStatus: 'scheduled' | 'in_progress' | 'completed' | 'skipped' | 'overdue',
  note?: string,
  actualDurationMinutes?: number,
  confidenceRating?: number,
) {
  const session = await getSessionById(userId, sessionId)
  if (!session) throw new Error('Session not found')

  const previousStatus = session.status
  const now = new Date()

  if (confidenceRating !== undefined && (!Number.isInteger(confidenceRating) || confidenceRating < 1 || confidenceRating > 5)) {
    throw new Error('Confidence rating must be an integer from 1 to 5')
  }
  if (newStatus === 'completed' && confidenceRating === undefined && previousStatus !== 'completed') {
    throw new Error('A confidence rating is required when completing a session')
  }
  const [updated] = await db
    .update(studySessions)
    .set({
      status: newStatus,
      completionNote: note ?? session.completionNote,
      actualDurationMinutes: actualDurationMinutes ?? session.actualDurationMinutes,
      completedAt: newStatus === 'completed' ? (session.completedAt ?? now) : null,
      confidenceRating: newStatus === 'completed' ? (confidenceRating ?? session.confidenceRating) : null,
      updatedAt: now,
    })
    .where(eq(studySessions.id, sessionId))
    .returning()

  await db.insert(sessionHistory).values({
    studySessionId: sessionId,
    userId,
    previousStatus,
    newStatus,
    action: newStatus === 'completed' ? 'completed' : newStatus === 'skipped' ? 'skipped' : 'edited',
  })

  return updated
}

export async function moveSession(
  userId: string,
  sessionId: string,
  newDate: string,
  newSlotName: string,
  newStartTime: string,
  newEndTime: string,
  newPosition: number,
) {
  const session = await getSessionById(userId, sessionId)
  if (!session) throw new Error('Session not found')
  if (session.status === 'completed') throw new Error('Cannot move a completed session')

  const previousDate = session.scheduledDate
  const targetSessions = await db.query.studySessions.findMany({
    where: and(
      eq(studySessions.userId, userId),
      eq(studySessions.seasonId, session.seasonId),
      eq(studySessions.scheduledDate, newDate),
    ),
  })
  if (targetSessions.some((item) => item.id !== sessionId && item.slotName === newSlotName)) {
    throw new Error('That time slot already has a session on the selected date')
  }
  const capacity = await getDailyCapacity(userId, session.seasonId, newDate)
  if (capacity?.isRestDay) throw new Error('This date is marked as a rest day')
  if (capacity && targetSessions.filter((item) => item.id !== sessionId && item.status !== 'skipped').length >= capacity.sessionCount) {
    throw new Error('Daily capacity is already full on the selected date')
  }

  const [updated] = await db
    .update(studySessions)
    .set({
      scheduledDate: newDate,
      slotName: newSlotName,
      startTime: newStartTime,
      endTime: newEndTime,
      position: newPosition,
      updatedAt: new Date(),
    })
    .where(eq(studySessions.id, sessionId))
    .returning()

  await db.insert(sessionHistory).values({
    studySessionId: sessionId,
    userId,
    previousDate,
    newDate,
    previousStatus: session.status,
    newStatus: session.status,
    action: 'rescheduled',
  })

  return updated
}

export async function removeSession(userId: string, sessionId: string) {
  const session = await getSessionById(userId, sessionId)
  if (!session) throw new Error('Session not found')
  if (session.status === 'completed') throw new Error('Cannot delete a completed session')

  await db.delete(studySessions).where(eq(studySessions.id, sessionId))
}

