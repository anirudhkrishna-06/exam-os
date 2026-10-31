// ============================================================
// modules/progress/activity-progress.ts
// Pure function: compute ActivityProgress from raw activity data.
// ============================================================

import type { ActivityProgress } from './types'

export function calculateActivityProgress(activity: {
  activityId: string
  activityType: 'theory_1' | 'theory_2' | 'numericals' | 'previous_papers' | 'revision'
  enabled: boolean
  weight: number | string
  estimatedSessions: number
  completedSessions: number
  status: string
}): ActivityProgress {
  const weight = Number(activity.weight)

  // If the whole activity is marked 'completed', treat it as fully done.
  const completed =
    activity.status === 'completed'
      ? activity.estimatedSessions // fully marked complete
      : activity.completedSessions

  const percent =
    activity.estimatedSessions > 0
      ? Math.min(100, Math.round((completed / activity.estimatedSessions) * 100))
      : activity.status === 'completed'
        ? 100
        : 0

  return {
    activityId: activity.activityId,
    activityType: activity.activityType,
    enabled: activity.enabled,
    weight,
    estimatedSessions: activity.estimatedSessions,
    completedSessions: completed,
    percentComplete: percent,
  }
}

