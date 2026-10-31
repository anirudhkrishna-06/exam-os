// ============================================================
// modules/planner/allocator.ts
// Greedy priority-based session allocation.
// ============================================================

import type {
  SessionRequirement,
  AvailableSlot,
  ScheduledSession,
  WorkloadWarning,
  PlannerInput,
} from './types'
import { timeToMinutes } from './slot-generator'
import type { SubjectBalance } from './priority-calculator'
import { prioritizeRequirements } from './priority-calculator'

export interface AllocationResult {
  scheduled: ScheduledSession[]
  unscheduled: SessionRequirement[]
  balance: SubjectBalance
}

function getFocusSubjects(
  date: string,
  input: PlannerInput,
  requirements: SessionRequirement[],
) {
  const subjectsWithWork = new Set(requirements.map((requirement) => requirement.subjectId))
  const upcoming = input.subjects.filter((subject) =>
    subject.examDate >= date && subjectsWithWork.has(subject.subjectId),
  )
  if (upcoming.length === 0) return { subjectIds: new Set<string>(), examDate: null }

  const nearestExamDate = upcoming.reduce(
    (nearest, subject) => subject.examDate < nearest ? subject.examDate : nearest,
    upcoming[0].examDate,
  )

  return {
    subjectIds: new Set(
      upcoming
        .filter((subject) => subject.examDate === nearestExamDate)
        .map((subject) => subject.subjectId),
    ),
    examDate: nearestExamDate,
  }
}

function canUseFocusSlot(
  requirement: SessionRequirement,
  slotDate: string,
  input: PlannerInput,
  requirements: SessionRequirement[],
): boolean {
  const focus = getFocusSubjects(slotDate, input, requirements)
  return focus.subjectIds.size === 0 || focus.subjectIds.has(requirement.subjectId)
}

/**
 * Greedily allocate session requirements to available slots.
 *
 * Strategy:
 * 1. Sort requirements by priority (desc).
 * 2. For each requirement, scan slots in date order.
 *    Pick the earliest slot that satisfies:
 *    a. Slot date is strictly before the activity's exam date.
 *    b. Slot date is on or after `today`.
 *    c. The slot is not already used.
 *    d. No consecutive same-subject sessions (unless unavoidable).
 * 3. Mark slot used. Track which subject occupied each slot.
 * 4. Update balance map for anti-starvation scoring.
 *
 * Re-prioritize after each allocation so balance bonuses reflect
 * the current state. We do a single-pass prioritization for
 * performance (deterministic and fast enough for the data sizes).
 */
export function allocate(
  requirements: SessionRequirement[],
  availableSlots: AvailableSlot[],
  input: PlannerInput,
): AllocationResult {
  const usedSlotKeys = new Set<string>()  // "date__slotName"
  const balance: SubjectBalance = {}
  const scheduled: ScheduledSession[] = []
  const unscheduled: SessionRequirement[] = []

  // Track last subject allocated per date to avoid consecutive same-subject slots
  const lastSubjectOnDate = new Map<string, string>()

  // Pre-prioritize (initial pass — balance is all zeros at start)
  const prioritized = prioritizeRequirements(requirements, availableSlots, input, balance)

  for (const req of prioritized) {
    let assigned = false

    // Try strict (no consecutive same-subject), then relax constraint if nothing found
    for (const strict of [true, false]) {
      for (const slot of availableSlots) {
        const key = `${slot.date}__${slot.slotName}`

        // Must not be used
        if (usedSlotKeys.has(key)) continue

        // Must be before exam date
        if (slot.date >= req.examDate) continue

        // Study only the subject with the nearest upcoming exam. Once that
        // exam passes, the focus naturally moves to the next subject.
        if (!canUseFocusSlot(req, slot.date, input, prioritized)) continue

        // Avoid same subject consecutively in same day (when strict)
        if (strict && lastSubjectOnDate.get(slot.date) === req.subjectId) continue

        // Slot found — assign
        usedSlotKeys.add(key)
        balance[req.subjectId] = (balance[req.subjectId] ?? 0) + 1
        lastSubjectOnDate.set(slot.date, req.subjectId)

        const durationMin = timeToMinutes(slot.endTime) - timeToMinutes(slot.startTime)

        scheduled.push({
          requirementId: req.requirementId,
          activityId: req.activityId,
          subjectId: req.subjectId,
          subjectName: req.subjectName,
          examDate: req.examDate,
          color: req.color,
          unitId: req.unitId,
          unitNumber: req.unitNumber,
          unitName: req.unitName,
          activityType: req.activityType,
          scheduledDate: slot.date,
          slotName: slot.slotName,
          startTime: slot.startTime,
          endTime: slot.endTime,
          position: slot.position,
          estimatedDurationMinutes: Math.max(0, durationMin),
        })
        assigned = true
        break
      }
      if (assigned) break
    }

    if (!assigned) {
      unscheduled.push(req)
    }
  }

  return { scheduled, unscheduled, balance }
}

/**
 * Convert unscheduled requirements into human-readable warnings.
 */
export function buildWarnings(
  unscheduled: SessionRequirement[],
): WorkloadWarning[] {
  // Group by activityId to aggregate session counts
  const grouped = new Map<string, SessionRequirement>()
  const counts = new Map<string, number>()

  for (const req of unscheduled) {
    grouped.set(req.activityId, req)
    counts.set(req.activityId, (counts.get(req.activityId) ?? 0) + 1)
  }

  const warnings: WorkloadWarning[] = []
  for (const [activityId, req] of grouped.entries()) {
    const n = counts.get(activityId) ?? 1
    warnings.push({
      type: 'unscheduled_activity',
      subjectId: req.subjectId,
      subjectName: req.subjectName,
      activityId,
      activityType: req.activityType,
      unitName: req.unitName,
      sessionsUnscheduled: n,
      message: `${req.subjectName} – ${req.unitName} (${req.activityType}): ${n} session(s) could not be scheduled before the exam date.`,
    })
  }

  return warnings
}

