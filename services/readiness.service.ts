// ============================================================
// services/readiness.service.ts
// Computes factual, transparent exam readiness metrics for subjects.
// ============================================================

import { db } from '@/db'
import { getSeasonProgress } from './progress.service'
import { dailyCapacity } from '@/db/schema/daily-capacity'
import { dailySessionTemplates } from '@/db/schema/daily-templates'
import { eq, and, sql } from 'drizzle-orm'
import { daysUntil, isExamUpcoming } from '@/lib/date/utils'
import { cacheAside } from '@/lib/redis/cache'
import { redisKeys } from '@/lib/redis/keys'
import { CACHE_TTL } from '@/lib/redis/ttl'

export interface UnitReadinessSummary {
  unitId: string
  unitNumber: number
  unitName: string
  percentComplete: number
  status: 'not_started' | 'in_progress' | 'completed'
}

export interface SubjectReadiness {
  subjectId: string
  subjectName: string
  color: string
  examDate: string
  daysRemaining: number
  percentComplete: number
  totalRequiredSessions: number
  completedSessions: number
  remainingSessions: number
  unitsCompleted: number
  unitsInProgress: number
  unitsNotStarted: number
  units: UnitReadinessSummary[]
  isOverloaded: boolean
  availableCapacityBeforeExam: number
  shortfallSessions: number
}

export async function getExamReadiness(
  userId: string,
  seasonId: string,
): Promise<SubjectReadiness[]> {
  // Version this cache entry so the corrected next-exam ordering is visible
  // immediately instead of reusing the old list for its remaining TTL.
  return cacheAside(redisKeys.dashboard(userId, seasonId, 'readiness-v3'), CACHE_TTL.dashboard, async () => {
  const seasonProgress = await getSeasonProgress(userId, seasonId)
  if (!seasonProgress) return []

  const now = new Date()

  const defaultTemplates = await db
    .select({
      cnt: sql<number>`count(*)`,
    })
    .from(dailySessionTemplates)
    .where(and(eq(dailySessionTemplates.userId, userId), eq(dailySessionTemplates.isEnabled, true)))

  const defaultDailyCapacity = Number(defaultTemplates[0]?.cnt || 3)

  const readinessList: SubjectReadiness[] = []

  for (const subject of seasonProgress.subjects) {
    const daysRemaining = daysUntil(subject.examDate)

    let unitsCompleted = 0
    let unitsInProgress = 0
    let unitsNotStarted = 0

    const unitSummaries: UnitReadinessSummary[] = subject.units.map((u) => {
      let status: 'not_started' | 'in_progress' | 'completed' = 'not_started'
      if (u.percentComplete >= 100) {
        status = 'completed'
        unitsCompleted++
      } else if (u.percentComplete > 0) {
        status = 'in_progress'
        unitsInProgress++
      } else {
        unitsNotStarted++
      }

      return {
        unitId: u.unitId,
        unitNumber: u.unitNumber,
        unitName: u.unitName,
        percentComplete: u.percentComplete,
        status,
      }
    })

    const remainingSessions = Math.max(
      0,
      subject.totalEstimatedSessions - subject.totalCompletedSessions,
    )

    // Estimate available slots before exam date
    // (daysRemaining * defaultDailyCapacity)
    const availableCapacityBeforeExam = daysRemaining * defaultDailyCapacity
    const isOverloaded = remainingSessions > availableCapacityBeforeExam
    const shortfallSessions = isOverloaded ? remainingSessions - availableCapacityBeforeExam : 0

    readinessList.push({
      subjectId: subject.subjectId,
      subjectName: subject.subjectName,
      color: subject.color,
      examDate: subject.examDate,
      daysRemaining,
      percentComplete: subject.percentComplete,
      totalRequiredSessions: subject.totalEstimatedSessions,
      completedSessions: subject.totalCompletedSessions,
      remainingSessions,
      unitsCompleted,
      unitsInProgress,
      unitsNotStarted,
      units: unitSummaries,
      isOverloaded,
      availableCapacityBeforeExam,
      shortfallSessions,
    })
  }

  // Keep past exams available to reports, but always place them after every
  // upcoming exam so the first item is genuinely the next exam.
  return readinessList.sort((a, b) => {
    const aPast = !isExamUpcoming(a.examDate, now)
    const bPast = !isExamUpcoming(b.examDate, now)
    if (aPast !== bPast) return aPast ? 1 : -1
    return a.examDate.localeCompare(b.examDate)
  })
  })
}
