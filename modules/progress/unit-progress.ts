// ============================================================
// modules/progress/unit-progress.ts
// Pure function: compute UnitProgress with weighted normalization.
// Weights of ENABLED activities are normalized to 100%.
// ============================================================

import type { UnitProgress } from './types'
import { calculateActivityProgress } from './activity-progress'

export function calculateUnitProgress(unit: {
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
}): UnitProgress {
  const activityProgressList = unit.activities.map((a) => calculateActivityProgress(a))
  const enabledActivities = activityProgressList.filter((a) => a.enabled)

  let percentComplete = 0
  if (enabledActivities.length > 0) {
    const totalWeight = enabledActivities.reduce((sum, a) => sum + a.weight, 0)
    if (totalWeight > 0) {
      percentComplete = Math.round(
        enabledActivities.reduce((sum, a) => sum + a.percentComplete * a.weight, 0) / totalWeight,
      )
    }
  }

  return {
    unitId: unit.unitId,
    unitNumber: unit.unitNumber,
    unitName: unit.unitName,
    initialStatus: unit.initialStatus,
    activities: activityProgressList,
    percentComplete,
  }
}

