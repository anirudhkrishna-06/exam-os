// ============================================================
// modules/planner/types.ts
// All types used across the planning engine.
// No database or React imports — pure TypeScript.
// ============================================================

export type ActivityType = 'theory_1' | 'theory_2' | 'numericals' | 'previous_papers' | 'revision'
export type UnitInitialStatus = 'new' | 'partially_studied' | 'previously_studied'
export type ActivityStatus = 'not_started' | 'in_progress' | 'completed'

// -------- Input types (read from DB, passed to engine) --------

export interface PlannerActivity {
  activityId: string
  activityType: ActivityType
  enabled: boolean
  status: ActivityStatus
  weight: number
  estimatedSessions: number
  completedSessions: number   // count of 'completed' study sessions for this activity
}

export interface PlannerUnit {
  unitId: string
  unitNumber: number
  unitName: string
  initialStatus: UnitInitialStatus
  activities: PlannerActivity[]
}

export interface PlannerSubject {
  subjectId: string
  subjectName: string
  examDate: string   // ISO YYYY-MM-DD
  color: string
  units: PlannerUnit[]
}

export interface PlannerSlotTemplate {
  templateId: string
  name: string
  startTime: string   // HH:MM:SS
  endTime: string     // HH:MM:SS
  position: number
  isEnabled: boolean
}

export interface CapacityOverride {
  date: string        // YYYY-MM-DD
  sessionCount: number
  isRestDay: boolean
}

export interface SlotOverride {
  date: string        // YYYY-MM-DD
  templateId: string | null
  slotName: string
  startTime: string
  endTime: string
  isAvailable: boolean
  position: number
}

export interface ExistingCompletedSession {
  sessionId: string
  activityId: string
  scheduledDate: string
  slotName: string
  startTime: string
  endTime: string
  position: number
  status: 'completed'
}

export interface PlannerInput {
  seasonId: string
  season: {
    startDate: string   // YYYY-MM-DD
    endDate: string     // YYYY-MM-DD
  }
  subjects: PlannerSubject[]
  slotTemplates: PlannerSlotTemplate[]
  defaultSessionsPerDay: number
  capacityOverrides: CapacityOverride[]
  slotOverrides: SlotOverride[]
  existingCompletedSessions: ExistingCompletedSession[]
  today: string   // YYYY-MM-DD — planning starts from this date
}

// -------- Internal engine types --------

export interface ExpandedActivity {
  subjectId: string
  subjectName: string
  examDate: string
  color: string
  unitId: string
  unitNumber: number
  unitName: string
  initialStatus: UnitInitialStatus
  activityId: string
  activityType: ActivityType
  enabled: boolean
  weight: number
  estimatedSessions: number
  completedSessions: number
  remainingSessions: number
  status: ActivityStatus
}

export interface SessionRequirement {
  // All ExpandedActivity fields
  subjectId: string
  subjectName: string
  examDate: string
  color: string
  unitId: string
  unitNumber: number
  unitName: string
  initialStatus: UnitInitialStatus
  activityId: string
  activityType: ActivityType
  estimatedSessions: number
  completedSessions: number
  remainingSessions: number
  weight: number
  // Requirement-specific
  requirementIndex: number   // 0-based index within this activity's sessions
  priority: number           // computed by priority-calculator
  requirementId: string      // unique ID for deduplication
}

export interface AvailableSlot {
  date: string       // YYYY-MM-DD
  slotName: string
  startTime: string  // HH:MM:SS
  endTime: string    // HH:MM:SS
  position: number
}

export interface ScheduledSession {
  requirementId: string
  activityId: string
  subjectId: string
  subjectName: string
  examDate: string
  color: string
  unitId: string
  unitNumber: number
  unitName: string
  activityType: ActivityType
  scheduledDate: string
  slotName: string
  startTime: string
  endTime: string
  position: number
  estimatedDurationMinutes: number
}

export interface WorkloadWarning {
  type: 'unscheduled_activity' | 'activity_after_exam' | 'overflow'
  subjectId: string
  subjectName: string
  activityId: string
  activityType: ActivityType
  unitName: string
  sessionsUnscheduled: number
  message: string
}

export interface PlannerOutput {
  sessions: ScheduledSession[]
  warnings: WorkloadWarning[]
  stats: {
    totalRequirements: number
    scheduled: number
    unscheduled: number
    slotsUsed: number
    slotsAvailable: number
  }
}

export interface ValidationViolation {
  type: 'overlap' | 'after_exam' | 'out_of_range' | 'exceeds_capacity'
  sessionIndex: number
  message: string
}

