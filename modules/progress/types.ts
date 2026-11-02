// ============================================================
// modules/progress/types.ts
// Pure TypeScript types for progress calculation — no DB imports.
// ============================================================

export interface ActivityProgress {
  activityId: string
  activityType: 'theory_1' | 'theory_2' | 'numericals' | 'previous_papers' | 'revision'
  enabled: boolean
  weight: number  // e.g. 25
  estimatedSessions: number
  completedSessions: number
  percentComplete: number  // 0-100
}

export interface UnitProgress {
  unitId: string
  unitNumber: number
  unitName: string
  initialStatus: string
  activities: ActivityProgress[]
  percentComplete: number  // weighted average of enabled activities, normalized to 100%
}

export interface SubjectProgress {
  subjectId: string
  subjectName: string
  examDate: string
  color: string
  units: UnitProgress[]
  percentComplete: number  // average of unit percentages
  totalEstimatedSessions: number
  totalCompletedSessions: number
  totalScheduledSessions: number
  confidenceRatedSessions?: number
  unitConfidence?: Record<string, { ratedSessions: number; averageRating: number; estimatedSessions: number }>
}

export interface SeasonProgress {
  seasonId: string
  seasonName: string
  subjects: SubjectProgress[]
  overallPercent: number  // average across subjects
  totalEstimated: number
  totalCompleted: number
  totalScheduled: number
  totalPending: number
  totalOverdue: number
}

