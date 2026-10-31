// ============================================================
// modules/planner/priority-calculator.ts
// Deterministic priority scoring for session requirements.
// ============================================================

import type { SessionRequirement, AvailableSlot, PlannerInput } from './types'

/**
 * Days between two YYYY-MM-DD date strings (a to b).
 */
function daysBetween(a: string, b: string): number {
  return Math.round(
    (Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`)) / 86_400_000,
  )
}

/**
 * Per-subject balancing state. Tracks sessions scheduled in
 * a rolling window to compute a "balance bonus."
 */
export interface SubjectBalance {
  [subjectId: string]: number   // total sessions allocated so far
}

/**
 * Activity type weights (higher = more urgent / foundational).
 */
const ACTIVITY_TYPE_WEIGHT: Record<string, number> = {
  theory_1: 0.90,
  theory_2: 0.85,
  numericals: 0.70,
  previous_papers: 0.60,
  revision: 0.95,
}

/**
 * Initial unit status weights.
 */
const INITIAL_STATUS_WEIGHT: Record<string, number> = {
  new: 1.0,
  partially_studied: 0.7,
  previously_studied: 0.4,
}

/**
 * Compute a priority score (higher = schedule sooner).
 *
 * Components and their max contribution to the 0-100 final score:
 *   urgency              40 pts  — proximity to exam
 *   statusWeight         20 pts  — how much work the unit needs
 *   activityTypeWeight   15 pts  — foundational vs review
 *   remainingRatio       15 pts  — proportion of work still left
 *   balanceBonus         10 pts  — anti-starvation across subjects
 *
 * Dependency penalties (subtracted before clamping):
 *   numericals without theory_1 done  → -30
 *   previous_papers without theory done → -25
 *   revision when far from exam        → -10 (unless within 20% of remaining days)
 */
export function calculatePriority(
  req: SessionRequirement,
  today: string,
  allSlots: AvailableSlot[],
  balance: SubjectBalance,
  totalSubjects: number,
  completedByActivity: Record<string, number>,   // activityId → completedSessions in DB
  activityCompletionByUnit: Record<string, Record<string, number>>,  // unitId → activityType → completedSessions
): number {
  const daysUntilExam = Math.max(0, daysBetween(today, req.examDate))
  const slotsBeforeExam = Math.max(1, allSlots.filter((slot) => slot.date < req.examDate).length)
  // --- Urgency (0-40) ---
  const urgencyRaw = Math.max(0, 100 - daysUntilExam)
  const capacityPressure = req.remainingSessions > slotsBeforeExam ? 4 : 0
  const urgencyScore = Math.min(40, urgencyRaw * 0.40 + capacityPressure)

  // --- Unit status (0-18) ---
  // New units get the strongest foundation-first treatment. Previously
  // studied units remain in the plan, but do not displace untouched work.
  const statusW = INITIAL_STATUS_WEIGHT[req.initialStatus] ?? 1.0
  const statusScore = statusW * 18

  // --- Activity type (0-12) ---
  const typeW = ACTIVITY_TYPE_WEIGHT[req.activityType] ?? 0.7
  const typeScore = typeW * 12

  // --- Remaining work (0-10) ---
  const remainingRatio = req.estimatedSessions > 0
    ? req.remainingSessions / req.estimatedSessions
    : 0
  const remainingScore = remainingRatio * 10

  // --- Unit difficulty / user weight (0-18) ---
  // `weight` is stored as a percentage in the database (normally 0-100),
  // while estimatedSessions captures how demanding the activity is. Support
  // the smaller fixture/input scale too, where weights are represented 0-1.
  const normalizedWeight = req.weight <= 1
    ? req.weight
    : Math.min(1, req.weight / 25)
  const normalizedEffort = Math.min(1, req.estimatedSessions / 8)
  const difficultyScore = (normalizedWeight * 0.55 + normalizedEffort * 0.45) * 18

  // --- Balance bonus (0-4): a small tie-breaker within the focused subject ---
  const totalAllocated = Object.values(balance).reduce((a, b) => a + b, 0)
  const subjectAllocated = balance[req.subjectId] ?? 0
  const fairShare = totalAllocated / Math.max(1, totalSubjects)
  const deficit = Math.max(0, fairShare - subjectAllocated)
  const balanceScore = Math.min(4, deficit)

  let score = urgencyScore + statusScore + typeScore + remainingScore + difficultyScore + balanceScore

  // --- Dependency penalties ---
  const unitActivities = activityCompletionByUnit[req.unitId] ?? {}

  if (req.activityType === 'numericals') {
    const theory1Done = (unitActivities['theory_1'] ?? 0) > 0
    if (!theory1Done) score -= 30
  }

  if (req.activityType === 'previous_papers') {
    const theory1Done = (unitActivities['theory_1'] ?? 0) > 0
    const theory2Done = (unitActivities['theory_2'] ?? 0) > 0
    if (!theory1Done && !theory2Done) score -= 25
  }

  if (req.activityType === 'revision') {
    // Revision should come in the last 20% of remaining days before exam
    const totalDays = Math.max(1, daysBetween(today, req.examDate))
    const threshold = totalDays * 0.20
    if (daysUntilExam > threshold) {
      // Too early for revision — deprioritize it
      score -= 10
    } else {
      // Close to exam — boost revision
      score += 10
    }
  }

  // Clamp to 0-100
  return Math.max(0, Math.min(100, score))
}

/**
 * Compute priorities for all requirements and sort descending.
 */
export function prioritizeRequirements(
  requirements: SessionRequirement[],
  allSlots: AvailableSlot[],
  input: PlannerInput,
  balance: SubjectBalance,
): SessionRequirement[] {
  const totalSubjects = input.subjects.length

  // Build activityCompletionByUnit map from existingCompletedSessions
  // We look at which activityIds have completed sessions
  const completedByActivity: Record<string, number> = {}
  for (const s of input.existingCompletedSessions) {
    completedByActivity[s.activityId] = (completedByActivity[s.activityId] ?? 0) + 1
  }

  // Build unit → activityType → completedCount for dependency checks
  const activityCompletionByUnit: Record<string, Record<string, number>> = {}
  for (const subject of input.subjects) {
    for (const unit of subject.units) {
      activityCompletionByUnit[unit.unitId] = {}
      for (const act of unit.activities) {
        activityCompletionByUnit[unit.unitId][act.activityType] = act.completedSessions
      }
    }
  }

  const scored = requirements.map(req => ({
    ...req,
    priority: calculatePriority(
      req,
      input.today,
      allSlots,
      balance,
      totalSubjects,
      completedByActivity,
      activityCompletionByUnit,
    ),
  }))

  // Sort by priority desc, then by exam date asc (earlier exam = more urgent at tie)
  return scored.sort((a, b) => {
    if (b.priority !== a.priority) return b.priority - a.priority
    if (a.examDate !== b.examDate) return a.examDate < b.examDate ? -1 : 1
    // Then by requirementIndex so session 0 comes before session 1 for same activity
    return a.requirementIndex - b.requirementIndex
  })
}

