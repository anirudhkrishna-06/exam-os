// ============================================================
// modules/planner/scheduler.ts
// Orchestrates the full planning pipeline.
// ============================================================

import type { PlannerInput, PlannerOutput, ScheduledSession } from './types'
import { expandActivities } from './activity-expander'
import { generateSlots } from './slot-generator'
import { prioritizeRequirements } from './priority-calculator'
import { allocate, buildWarnings } from './allocator'
import { validatePlan } from './validator'

/**
 * Generate a complete study plan from scratch.
 *
 * The function is deterministic: given the same PlannerInput,
 * it always produces the same PlannerOutput. No randomness, no
 * external calls.
 */
export function generatePlan(input: PlannerInput): PlannerOutput {
  // Step 1: Expand syllabus into session requirements
  const requirements = expandActivities(input)

  // Step 2: Enumerate available slots
  const slots = generateSlots(input)

  // Step 3: Allocate (greedy priority-based)
  const { scheduled, unscheduled } = allocate(requirements, slots, input)

  // Step 4: Build warnings for unscheduled requirements
  const warnings = buildWarnings(unscheduled)

  // Step 5: Validate (log violations but don't throw — surface as warnings)
  const violations = validatePlan(scheduled)
  for (const v of violations) {
    console.warn('[scheduler] validation violation:', v.message)
  }

  const stats = {
    totalRequirements: requirements.length,
    scheduled: scheduled.length,
    unscheduled: unscheduled.length,
    slotsUsed: scheduled.length,
    slotsAvailable: slots.length,
  }

  return { sessions: scheduled, warnings, stats }
}

