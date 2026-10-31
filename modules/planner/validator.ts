// ============================================================
// modules/planner/validator.ts
// Post-allocation validation — catches planning constraint
// violations before the plan is written to the database.
// ============================================================

import type { ScheduledSession, ValidationViolation } from './types'
import { timeToMinutes } from './slot-generator'

/**
 * Validate a list of scheduled sessions.
 *
 * Checks:
 * 1. No two sessions occupy the same (date, slotName) pair.
 * 2. No session is scheduled on or after its exam date.
 * 3. All sessions have non-negative estimated durations.
 *
 * Returns an array of violations (empty = plan is valid).
 */
export function validatePlan(sessions: ScheduledSession[]): ValidationViolation[] {
  const violations: ValidationViolation[] = []
  const slotKeys = new Map<string, number>()  // key → first session index

  for (let i = 0; i < sessions.length; i++) {
    const s = sessions[i]
    const key = `${s.scheduledDate}__${s.slotName}`

    // Overlap check
    const existing = slotKeys.get(key)
    if (existing !== undefined) {
      violations.push({
        type: 'overlap',
        sessionIndex: i,
        message: `Sessions ${existing} and ${i} share slot "${s.slotName}" on ${s.scheduledDate}`,
      })
    } else {
      slotKeys.set(key, i)
    }

    // After-exam check
    if (s.scheduledDate >= s.examDate) {
      violations.push({
        type: 'after_exam',
        sessionIndex: i,
        message: `Session ${i} (${s.subjectName}) is scheduled on/after exam date ${s.examDate}`,
      })
    }

    // Non-negative duration
    const dur = timeToMinutes(s.endTime) - timeToMinutes(s.startTime)
    if (dur < 0) {
      violations.push({
        type: 'exceeds_capacity',
        sessionIndex: i,
        message: `Session ${i} has negative duration (${s.startTime} → ${s.endTime})`,
      })
    }
  }

  return violations
}

