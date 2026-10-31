// ============================================================
// modules/planner/__tests__/fixtures.ts
// Shared test fixtures — deterministic, no randomness.
// ============================================================

import type { PlannerInput, PlannerSubject, PlannerSlotTemplate } from '../types'

/** Fixed "today" for all tests */
export const TODAY = '2024-03-01'

/** Standard 4-slot daily template */
export const SLOT_TEMPLATES: PlannerSlotTemplate[] = [
  { templateId: 'slot-1', name: 'Morning', startTime: '09:00:00', endTime: '11:00:00', position: 1, isEnabled: true },
  { templateId: 'slot-2', name: 'Pre-lunch', startTime: '12:00:00', endTime: '13:30:00', position: 2, isEnabled: true },
  { templateId: 'slot-3', name: 'Afternoon', startTime: '14:00:00', endTime: '16:00:00', position: 3, isEnabled: true },
  { templateId: 'slot-4', name: 'Evening', startTime: '17:00:00', endTime: '18:00:00', position: 4, isEnabled: true },
  { templateId: 'slot-5', name: 'Night', startTime: '20:00:00', endTime: '22:00:00', position: 5, isEnabled: true },
]

/** A simple subject with one unit and one activity needing 2 sessions */
export function makeSubject(overrides: Partial<PlannerSubject> = {}): PlannerSubject {
  return {
    subjectId: 'sub-1',
    subjectName: 'Mathematics',
    examDate: '2024-03-15',
    color: '#3B82F6',
    units: [
      {
        unitId: 'unit-1',
        unitNumber: 1,
        unitName: 'Algebra',
        initialStatus: 'new',
        activities: [
          {
            activityId: 'act-theory1',
            activityType: 'theory_1',
            enabled: true,
            status: 'not_started',
            weight: 1.0,
            estimatedSessions: 2,
            completedSessions: 0,
          },
        ],
      },
    ],
    ...overrides,
  }
}

export function makeInput(overrides: Partial<PlannerInput> = {}): PlannerInput {
  return {
    seasonId: 'season-1',
    season: { startDate: TODAY, endDate: '2024-03-31' },
    subjects: [makeSubject()],
    slotTemplates: SLOT_TEMPLATES,
    defaultSessionsPerDay: 4,
    capacityOverrides: [],
    slotOverrides: [],
    existingCompletedSessions: [],
    today: TODAY,
    ...overrides,
  }
}

