// ============================================================
// services/progress.service.ts
// Fetches DB data and wires it into progress calculation modules.
// ============================================================

import { db } from '@/db'
import { subjects } from '@/db/schema/subjects'
import { units } from '@/db/schema/units'
import { unitActivities } from '@/db/schema/activities'
import { studySessions } from '@/db/schema/study-sessions'
import { examSeasons } from '@/db/schema/exam-seasons'
import { eq, and, count, sql, asc } from 'drizzle-orm'
import { calculateSubjectProgress } from '@/modules/progress/subject-progress'
import { calculateSeasonProgress } from '@/modules/progress/season-progress'
import type { SeasonProgress, SubjectProgress } from '@/modules/progress/types'

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/** Returns a map of activityId → completed session count */
async function fetchCompletedCountsByActivity(
  userId: string,
  activityIds: string[],
): Promise<Map<string, number>> {
  if (activityIds.length === 0) return new Map()

  const rows = await db
    .select({
      activityId: studySessions.activityId,
      cnt: count(studySessions.id),
    })
    .from(studySessions)
    .where(
      and(
        eq(studySessions.userId, userId),
        eq(studySessions.status, 'completed'),
        sql`${studySessions.activityId} = ANY(${sql.raw(`ARRAY[${activityIds.map((id) => `'${id}'`).join(',')}]::uuid[]`)})`,
      ),
    )
    .groupBy(studySessions.activityId)

  const map = new Map<string, number>()
  for (const row of rows) {
    map.set(row.activityId, Number(row.cnt))
  }
  return map
}

/** Aggregate session status counts for a season */
async function fetchSeasonSessionStats(userId: string, seasonId: string) {
  const rows = await db
    .select({
      status: studySessions.status,
      cnt: count(studySessions.id),
    })
    .from(studySessions)
    .where(and(eq(studySessions.userId, userId), eq(studySessions.seasonId, seasonId)))
    .groupBy(studySessions.status)

  const stats = { totalCompleted: 0, totalScheduled: 0, totalPending: 0, totalOverdue: 0 }
  for (const row of rows) {
    const n = Number(row.cnt)
    if (row.status === 'completed') stats.totalCompleted += n
    if (row.status === 'scheduled') stats.totalScheduled += n
    if (row.status === 'in_progress') stats.totalPending += n
    if (row.status === 'skipped') stats.totalPending += n
    if (row.status === 'overdue') stats.totalOverdue += n
  }
  return stats
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Get progress for a given season (all subjects, units, activities).
 */
export async function getSeasonProgress(
  userId: string,
  seasonId: string,
): Promise<SeasonProgress | null> {
  // 1. Verify season ownership
  const season = await db.query.examSeasons.findFirst({
    where: and(eq(examSeasons.id, seasonId), eq(examSeasons.userId, userId)),
  })
  if (!season) return null

  // 2. Fetch subjects with nested units + activities
  const subjectRows = await db.query.subjects.findMany({
    where: and(eq(subjects.seasonId, seasonId), eq(subjects.userId, userId)),
    orderBy: [asc(subjects.position)],
    with: {
      units: {
        orderBy: [asc(units.position)],
        with: { unitActivities: true },
      },
    },
  })

  // 3. Collect all activity IDs and fetch completed counts
  const allActivityIds: string[] = []
  for (const sub of subjectRows) {
    for (const unit of sub.units) {
      for (const act of unit.unitActivities) {
        allActivityIds.push(act.id)
      }
    }
  }
  const completedMap = await fetchCompletedCountsByActivity(userId, allActivityIds)

  // 4. Fetch per-subject scheduled/completed session counts
  const subjectSessionRows = await db
    .select({
      subjectId: subjects.id,
      status: studySessions.status,
      cnt: count(studySessions.id),
    })
    .from(studySessions)
    .innerJoin(unitActivities, eq(studySessions.activityId, unitActivities.id))
    .innerJoin(units, eq(unitActivities.unitId, units.id))
    .innerJoin(subjects, eq(units.subjectId, subjects.id))
    .where(and(eq(studySessions.userId, userId), eq(studySessions.seasonId, seasonId)))
    .groupBy(subjects.id, studySessions.status)

  type SessionStatMap = Map<string, { totalEstimated: number; totalCompleted: number; totalScheduled: number }>
  const subjectStatsMap: SessionStatMap = new Map()
  for (const row of subjectSessionRows) {
    const existing = subjectStatsMap.get(row.subjectId) ?? {
      totalEstimated: 0,
      totalCompleted: 0,
      totalScheduled: 0,
    }
    const n = Number(row.cnt)
    if (row.status === 'completed') existing.totalCompleted += n
    if (row.status === 'scheduled') existing.totalScheduled += n
    // totalEstimated = all sessions regardless of status
    existing.totalEstimated += n
    subjectStatsMap.set(row.subjectId, existing)
  }

  const ratedSubjectRows = await db
    .select({ subjectId: subjects.id, confidenceRating: studySessions.confidenceRating })
    .from(studySessions)
    .innerJoin(unitActivities, eq(studySessions.activityId, unitActivities.id))
    .innerJoin(units, eq(unitActivities.unitId, units.id))
    .innerJoin(subjects, eq(units.subjectId, subjects.id))
    .where(and(eq(studySessions.userId, userId), eq(studySessions.seasonId, seasonId), eq(studySessions.status, 'completed')))
  const confidenceMap = new Map<string, number[]>()
  for (const row of ratedSubjectRows) if (row.confidenceRating != null) confidenceMap.set(row.subjectId, [...(confidenceMap.get(row.subjectId) ?? []), row.confidenceRating])

  // 5. Build subject input for calculateSeasonProgress
  const seasonSubjects = subjectRows.map((sub) => ({
    subjectId: sub.id,
    subjectName: sub.name,
    examDate: sub.examDate,
    color: sub.color ?? '#6366f1',
    units: sub.units.map((unit) => ({
      unitId: unit.id,
      unitNumber: unit.unitNumber,
      unitName: unit.name,
      initialStatus: unit.initialStatus,
      activities: unit.unitActivities.map((act) => ({
        activityId: act.id,
        activityType: act.activityType,
        enabled: act.enabled,
        weight: act.weight,
        estimatedSessions: act.estimatedSessions,
        completedSessions: completedMap.get(act.id) ?? 0,
        status: act.status,
      })),
    })),
    sessionStats: subjectStatsMap.get(sub.id) ?? {
      totalEstimated: 0,
      totalCompleted: 0,
      totalScheduled: 0,
    },
    confidenceRatings: confidenceMap.get(sub.id) ?? [],
  }))

  // 6. Season-level session stats
  const seasonStats = await fetchSeasonSessionStats(userId, seasonId)

  return calculateSeasonProgress({
    seasonId: season.id,
    seasonName: season.name,
    subjects: seasonSubjects,
    sessionStats: seasonStats,
  })
}

/**
 * Get progress for a single subject (with full unit/activity detail).
 */
export async function getSubjectProgress(
  userId: string,
  subjectId: string,
): Promise<SubjectProgress | null> {
  // 1. Fetch subject with nested data (verify ownership via userId on subject)
  const subject = await db.query.subjects.findFirst({
    where: and(eq(subjects.id, subjectId), eq(subjects.userId, userId)),
    with: {
      units: {
        orderBy: [asc(units.position)],
        with: { unitActivities: true },
      },
    },
  })
  if (!subject) return null

  // 2. Collect activity IDs and fetch completed counts
  const activityIds: string[] = []
  for (const unit of subject.units) {
    for (const act of unit.unitActivities) {
      activityIds.push(act.id)
    }
  }
  const completedMap = await fetchCompletedCountsByActivity(userId, activityIds)

  // 3. Fetch session stats for this subject
  const sessionRows = await db
    .select({
      status: studySessions.status,
      cnt: count(studySessions.id),
    })
    .from(studySessions)
    .innerJoin(unitActivities, eq(studySessions.activityId, unitActivities.id))
    .innerJoin(units, eq(unitActivities.unitId, units.id))
    .where(and(eq(studySessions.userId, userId), eq(units.subjectId, subjectId)))
    .groupBy(studySessions.status)

  const sessionStats = { totalEstimated: 0, totalCompleted: 0, totalScheduled: 0 }
  for (const row of sessionRows) {
    const n = Number(row.cnt)
    if (row.status === 'completed') sessionStats.totalCompleted += n
    if (row.status === 'scheduled') sessionStats.totalScheduled += n
    sessionStats.totalEstimated += n
  }

  const ratedSessions = await db
    .select({ confidenceRating: studySessions.confidenceRating })
    .from(studySessions)
    .innerJoin(unitActivities, eq(studySessions.activityId, unitActivities.id))
    .innerJoin(units, eq(unitActivities.unitId, units.id))
    .where(and(eq(studySessions.userId, userId), eq(units.subjectId, subjectId), eq(studySessions.status, 'completed')))
  const confidenceRatings = ratedSessions.flatMap((row) => row.confidenceRating == null ? [] : [row.confidenceRating])

  return calculateSubjectProgress({
    subjectId: subject.id,
    subjectName: subject.name,
    examDate: subject.examDate,
    color: subject.color ?? '#6366f1',
    units: subject.units.map((unit) => ({
      unitId: unit.id,
      unitNumber: unit.unitNumber,
      unitName: unit.name,
      initialStatus: unit.initialStatus,
      activities: unit.unitActivities.map((act) => ({
        activityId: act.id,
        activityType: act.activityType,
        enabled: act.enabled,
        weight: act.weight,
        estimatedSessions: act.estimatedSessions,
        completedSessions: completedMap.get(act.id) ?? 0,
        status: act.status,
      })),
    })),
    sessionStats,
    confidenceRatings,
  })
}

