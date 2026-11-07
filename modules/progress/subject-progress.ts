// ============================================================
// modules/progress/subject-progress.ts
// Pure function: compute SubjectProgress from nested unit data.
// ============================================================

import type { SubjectProgress } from './types'
import { boostProgressPercent, calculateUnitProgress } from './unit-progress'

export function calculateSubjectProgress(subject: {
  subjectId: string
  subjectName: string
  examDate: string
  color: string
  units: Array<{
    unitId: string
    unitNumber: number
    unitName: string
    initialStatus: string
    activities: Array<{
      activityId: string
      activityType: 'theory_1' | 'theory_2' | 'numericals' | 'previous_papers' | 'revision'
      enabled: boolean
      weight: number | string
      estimatedSessions: number
      completedSessions: number
      status: string
    }>
  }>
  sessionStats?: {
    totalEstimated: number
    totalCompleted: number
    totalScheduled: number
  }
  unitConfidence?: Record<string, { ratedSessions: number; averageRating: number; estimatedSessions: number }>
}): SubjectProgress {
  const unitProgressList = subject.units.map((u) => {
    if (subject.unitConfidence === undefined) return calculateUnitProgress(u)
    const confidence = subject.unitConfidence?.[u.unitId]
    if (!confidence || confidence.ratedSessions === 0) return { ...calculateUnitProgress(u), percentComplete: 0 }
    const coverage = Math.min(1, confidence.ratedSessions / Math.max(1, confidence.estimatedSessions))
    return { ...calculateUnitProgress(u), percentComplete: Math.round((confidence.averageRating / 5) * coverage * 100) }
  })

  const rawPercentComplete =
    unitProgressList.length > 0
      ? Math.round(
          unitProgressList.reduce((sum, u) => sum + u.percentComplete, 0) / unitProgressList.length,
        )
      : 0
  const percentComplete = boostProgressPercent(rawPercentComplete)

  return {
    subjectId: subject.subjectId,
    subjectName: subject.subjectName,
    examDate: subject.examDate,
    color: subject.color,
    units: unitProgressList,
    percentComplete,
    totalEstimatedSessions: subject.sessionStats?.totalEstimated ?? 0,
    totalCompletedSessions: subject.sessionStats?.totalCompleted ?? 0,
    totalScheduledSessions: subject.sessionStats?.totalScheduled ?? 0,
    confidenceRatedSessions: Object.values(subject.unitConfidence ?? {}).reduce((sum, item) => sum + item.ratedSessions, 0),
    unitConfidence: subject.unitConfidence,
  }
}

