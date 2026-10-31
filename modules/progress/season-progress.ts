// ============================================================
// modules/progress/season-progress.ts
// Pure function: compute SeasonProgress from all subject data.
// ============================================================

import type { SeasonProgress } from './types'
import { calculateSubjectProgress } from './subject-progress'

type SubjectInput = Parameters<typeof calculateSubjectProgress>[0]

export function calculateSeasonProgress(season: {
  seasonId: string
  seasonName: string
  subjects: SubjectInput[]
  sessionStats?: {
    totalCompleted: number
    totalScheduled: number
    totalPending: number
    totalOverdue: number
  }
}): SeasonProgress {
  const subjectProgressList = season.subjects.map((s) => calculateSubjectProgress(s))

  const overallPercent =
    subjectProgressList.length > 0
      ? Math.round(
          subjectProgressList.reduce((sum, s) => sum + s.percentComplete, 0) /
            subjectProgressList.length,
        )
      : 0

  const totalEstimated = subjectProgressList.reduce((sum, s) => sum + s.totalEstimatedSessions, 0)
  const totalCompleted = season.sessionStats?.totalCompleted ?? 0
  const totalScheduled = season.sessionStats?.totalScheduled ?? 0
  const totalPending = season.sessionStats?.totalPending ?? 0
  const totalOverdue = season.sessionStats?.totalOverdue ?? 0

  return {
    seasonId: season.seasonId,
    seasonName: season.seasonName,
    subjects: subjectProgressList,
    overallPercent,
    totalEstimated,
    totalCompleted,
    totalScheduled,
    totalPending,
    totalOverdue,
  }
}

