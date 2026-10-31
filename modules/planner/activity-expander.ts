// ============================================================
// modules/planner/activity-expander.ts
// Expand subjects/units/activities into flat SessionRequirements.
// ============================================================

import type { PlannerInput, SessionRequirement, ExpandedActivity } from './types'

/**
 * Returns one SessionRequirement per session needed for each
 * enabled, non-completed activity. Multi-session activities
 * produce multiple requirements with distinct requirementIndex values.
 */
export function expandActivities(input: PlannerInput): SessionRequirement[] {
  const requirements: SessionRequirement[] = []

  for (const subject of input.subjects) {
    for (const unit of subject.units) {
      for (const activity of unit.activities) {
        // Skip disabled activities
        if (!activity.enabled) continue
        // Skip completed activities
        if (activity.status === 'completed') continue

        const remaining = Math.max(0, activity.estimatedSessions - activity.completedSessions)
        if (remaining === 0) continue

        // Generate one requirement per remaining session
        for (let i = 0; i < remaining; i++) {
          const requirementId = `${activity.activityId}__${i}`
          requirements.push({
            subjectId: subject.subjectId,
            subjectName: subject.subjectName,
            examDate: subject.examDate,
            color: subject.color,
            unitId: unit.unitId,
            unitNumber: unit.unitNumber,
            unitName: unit.unitName,
            initialStatus: unit.initialStatus,
            activityId: activity.activityId,
            activityType: activity.activityType,
            estimatedSessions: activity.estimatedSessions,
            completedSessions: activity.completedSessions,
            remainingSessions: remaining,
            weight: activity.weight,
            requirementIndex: i,
            priority: 0,  // filled in by priority-calculator
            requirementId,
          })
        }
      }
    }
  }

  return requirements
}

