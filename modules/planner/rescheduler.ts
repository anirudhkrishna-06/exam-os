// ============================================================
// modules/planner/rescheduler.ts
// Re-plan around completed/locked sessions.
// ============================================================

import type {
  PlannerInput,
  PlannerOutput,
  ScheduledSession,
  AvailableSlot,
  ExistingCompletedSession,
} from './types'
import { expandActivities } from './activity-expander'
import { generateSlots } from './slot-generator'
import { allocate, buildWarnings } from './allocator'
import { validatePlan } from './validator'

export interface RescheduleInput extends PlannerInput {
  /** All current study sessions (including completed ones) */
  existingPlan: Array<{
    sessionId: string
    activityId: string
    subjectId: string
    subjectName: string
    examDate: string
    color: string
    unitId: string
    unitNumber: number
    unitName: string
    activityType: import('./types').ActivityType
    scheduledDate: string
    slotName: string
    startTime: string
    endTime: string
    position: number
    estimatedDurationMinutes: number
    status: 'scheduled' | 'in_progress' | 'completed' | 'skipped' | 'overdue'
  }>
}

export interface RescheduleOutput extends PlannerOutput {
  preserved: ScheduledSession[]
  rescheduled: ScheduledSession[]
  diff: {
    preservedCount: number
    rescheduledCount: number
    newCount: number
  }
}

/**
 * Re-plan a season while preserving completed sessions.
 *
 * 1. Separate completed sessions → preserved (locked into their slots).
 * 2. Remove locked slots from the available pool.
 * 3. Re-expand activities (skipping already-completed work).
 * 4. Run the standard allocator on remaining slots.
 * 5. Merge preserved + newly scheduled sessions.
 */
export function reschedulePlan(input: RescheduleInput): RescheduleOutput {
  // 1. Identify completed sessions to preserve
  const completedSessions = input.existingPlan.filter(s => s.status === 'completed')
  const nonCompletedOldSessions = input.existingPlan.filter(s => s.status !== 'completed')

  // Map completed to ScheduledSession shape for merging
  const preserved: ScheduledSession[] = completedSessions.map(s => ({
    requirementId: `preserved__${s.sessionId}`,
    activityId: s.activityId,
    subjectId: s.subjectId,
    subjectName: s.subjectName,
    examDate: s.examDate,
    color: s.color,
    unitId: s.unitId,
    unitNumber: s.unitNumber,
    unitName: s.unitName,
    activityType: s.activityType,
    scheduledDate: s.scheduledDate,
    slotName: s.slotName,
    startTime: s.startTime,
    endTime: s.endTime,
    position: s.position,
    estimatedDurationMinutes: s.estimatedDurationMinutes,
  }))

  // 2. Build the set of slots already taken by completed sessions
  const lockedSlotKeys = new Set(
    completedSessions.map(s => `${s.scheduledDate}__${s.slotName}`)
  )

  // 3. Generate all slots, then remove locked ones
  const allSlots = generateSlots(input)
  const freeSlots = allSlots.filter(
    slot => !lockedSlotKeys.has(`${slot.date}__${slot.slotName}`)
  )

  // 4. Re-expand (activities already completed will be skipped by expander)
  const requirements = expandActivities(input)

  // 5. Allocate on free slots
  const { scheduled: newlyScheduled, unscheduled } = allocate(requirements, freeSlots, input)

  const warnings = buildWarnings(unscheduled)

  const violations = validatePlan([...preserved, ...newlyScheduled])
  for (const v of violations) {
    console.warn('[rescheduler] validation violation:', v.message)
  }

  const stats = {
    totalRequirements: requirements.length,
    scheduled: newlyScheduled.length,
    unscheduled: unscheduled.length,
    slotsUsed: preserved.length + newlyScheduled.length,
    slotsAvailable: allSlots.length,
  }

  return {
    sessions: [...preserved, ...newlyScheduled],
    warnings,
    stats,
    preserved,
    rescheduled: newlyScheduled,
    diff: {
      preservedCount: preserved.length,
      rescheduledCount: nonCompletedOldSessions.length,
      newCount: newlyScheduled.length,
    },
  }
}

