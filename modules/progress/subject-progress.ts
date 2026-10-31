// ============================================================
// modules/progress/subject-progress.ts
// Pure function: compute SubjectProgress from nested unit data.
// ============================================================

import type { SubjectProgress } from './types'
import { calculateUnitProgress } from './unit-progress'

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
}): SubjectProgress {
  const unitProgressList = subject.units.map((u) => calculateUnitProgress(u))

  const percentComplete =
    unitProgressList.length > 0
      ? Math.round(
          unitProgressList.reduce((sum, u) => sum + u.percentComplete, 0) / unitProgressList.length,
        )
      : 0

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
  }
}

