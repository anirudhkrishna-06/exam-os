// ============================================================
// modules/planner/__tests__/scheduler.test.ts
// Full end-to-end tests for the planning engine.
// ============================================================

import { describe, it, expect } from 'vitest'
import { generatePlan } from '../scheduler'
import { reschedulePlan } from '../rescheduler'
import { makeInput, makeSubject, TODAY } from './fixtures'
import type { PlannerSubject } from '../types'

// ---- helpers ----

function twoSubjects(): PlannerSubject[] {
  return [
    {
      subjectId: 'sub-math',
      subjectName: 'Mathematics',
      examDate: '2024-03-20',
      color: '#3B82F6',
      units: [
        {
          unitId: 'unit-m1',
          unitNumber: 1,
          unitName: 'Algebra',
          initialStatus: 'new',
          activities: [
            { activityId: 'act-m-t1', activityType: 'theory_1', enabled: true, status: 'not_started', weight: 1, estimatedSessions: 2, completedSessions: 0 },
            { activityId: 'act-m-t2', activityType: 'theory_2', enabled: true, status: 'not_started', weight: 1, estimatedSessions: 2, completedSessions: 0 },
          ],
        },
      ],
    },
    {
      subjectId: 'sub-phys',
      subjectName: 'Physics',
      examDate: '2024-03-22',
      color: '#EF4444',
      units: [
        {
          unitId: 'unit-p1',
          unitNumber: 1,
          unitName: 'Mechanics',
          initialStatus: 'new',
          activities: [
            { activityId: 'act-p-t1', activityType: 'theory_1', enabled: true, status: 'not_started', weight: 1, estimatedSessions: 2, completedSessions: 0 },
            { activityId: 'act-p-t2', activityType: 'theory_2', enabled: true, status: 'not_started', weight: 1, estimatedSessions: 2, completedSessions: 0 },
          ],
        },
      ],
    },
  ]
}

describe('generatePlan', () => {
  it('schedules sessions within the planning window', () => {
    const input = makeInput()
    const output = generatePlan(input)
    // Subject has 2 required sessions; they should all be scheduled
    expect(output.sessions.length).toBeGreaterThanOrEqual(1)
    // All sessions must be before exam date
    for (const s of output.sessions) {
      expect(s.scheduledDate < s.examDate).toBe(true)
    }
  })

  it('produces no slot overlaps', () => {
    const input = makeInput({ subjects: twoSubjects() })
    const output = generatePlan(input)

    const slotKeys = new Set<string>()
    for (const s of output.sessions) {
      const key = `${s.scheduledDate}__${s.slotName}`
      expect(slotKeys.has(key)).toBe(false)
      slotKeys.add(key)
    }
  })

  it('focuses the subject with the nearest exam', () => {
    const input = makeInput({ subjects: twoSubjects() })
    const output = generatePlan(input)

    const mathSessions = output.sessions.filter(s => s.subjectId === 'sub-math')
    const physSessions = output.sessions.filter(s => s.subjectId === 'sub-phys')

    expect(mathSessions.length).toBeGreaterThan(0)
    expect(physSessions.length).toBeGreaterThan(0)
    expect(physSessions.every((session) => session.scheduledDate >= '2024-03-20')).toBe(true)
  })

  it('respects defaultSessionsPerDay — never exceeds it per day', () => {
    const input = makeInput({
      subjects: twoSubjects(),
      defaultSessionsPerDay: 2,
    })
    const output = generatePlan(input)

    const perDay = new Map<string, number>()
    for (const s of output.sessions) {
      perDay.set(s.scheduledDate, (perDay.get(s.scheduledDate) ?? 0) + 1)
    }
    for (const [, count] of perDay) {
      expect(count).toBeLessThanOrEqual(2)
    }
  })

  it('generates warnings for activities that cannot be scheduled', () => {
    // 1-day window with 1 slot, but subject needs 4 sessions → some must be unscheduled
    const input = makeInput({
      season: { startDate: TODAY, endDate: TODAY },
      defaultSessionsPerDay: 1,
      subjects: [
        {
          ...makeSubject(),
          examDate: '2024-03-02',  // exam tomorrow
          units: [
            {
              unitId: 'unit-1',
              unitNumber: 1,
              unitName: 'Algebra',
              initialStatus: 'new',
              activities: [
                { activityId: 'act-t1', activityType: 'theory_1', enabled: true, status: 'not_started', weight: 1, estimatedSessions: 4, completedSessions: 0 },
              ],
            },
          ],
        },
      ],
    })
    const output = generatePlan(input)
    // 1 slot available, 4 required → 3 warnings
    expect(output.warnings.length).toBeGreaterThan(0)
    expect(output.stats.unscheduled).toBeGreaterThan(0)
  })

  it('skips disabled activities', () => {
    const input = makeInput({
      subjects: [
        {
          ...makeSubject(),
          units: [
            {
              unitId: 'unit-1',
              unitNumber: 1,
              unitName: 'Algebra',
              initialStatus: 'new',
              activities: [
                { activityId: 'act-disabled', activityType: 'theory_1', enabled: false, status: 'not_started', weight: 1, estimatedSessions: 5, completedSessions: 0 },
              ],
            },
          ],
        },
      ],
    })
    const output = generatePlan(input)
    expect(output.sessions.length).toBe(0)
    expect(output.warnings.length).toBe(0)
  })

  it('skips completed activities', () => {
    const input = makeInput({
      subjects: [
        {
          ...makeSubject(),
          units: [
            {
              unitId: 'unit-1',
              unitNumber: 1,
              unitName: 'Algebra',
              initialStatus: 'new',
              activities: [
                { activityId: 'act-done', activityType: 'theory_1', enabled: true, status: 'completed', weight: 1, estimatedSessions: 3, completedSessions: 3 },
              ],
            },
          ],
        },
      ],
    })
    const output = generatePlan(input)
    expect(output.sessions.length).toBe(0)
  })

  it('prioritizes theory_1 before numericals for same unit', () => {
    const input = makeInput({
      season: { startDate: TODAY, endDate: '2024-03-20' },
      subjects: [
        {
          ...makeSubject(),
          units: [
            {
              unitId: 'unit-1',
              unitNumber: 1,
              unitName: 'Algebra',
              initialStatus: 'new',
              activities: [
                { activityId: 'act-num', activityType: 'numericals', enabled: true, status: 'not_started', weight: 1, estimatedSessions: 2, completedSessions: 0 },
                { activityId: 'act-t1', activityType: 'theory_1', enabled: true, status: 'not_started', weight: 1, estimatedSessions: 2, completedSessions: 0 },
              ],
            },
          ],
        },
      ],
      defaultSessionsPerDay: 1,
    })
    const output = generatePlan(input)
    // With 1 session/day, theory_1 should appear before numericals (lower date index)
    const t1Sessions = output.sessions.filter(s => s.activityType === 'theory_1')
    const numSessions = output.sessions.filter(s => s.activityType === 'numericals')
    if (t1Sessions.length > 0 && numSessions.length > 0) {
      const firstT1Date = t1Sessions.map(s => s.scheduledDate).sort()[0]
      const firstNumDate = numSessions.map(s => s.scheduledDate).sort()[0]
      expect(firstT1Date <= firstNumDate).toBe(true)
    }
  })

  it('does not schedule a later subject before the nearest exam is completed', () => {
    const input = makeInput({
      season: { startDate: TODAY, endDate: '2024-03-09' },
      defaultSessionsPerDay: 2,
      subjects: [
        makeSubject({
          subjectId: 'sub-math-focus',
          subjectName: 'Mathematics',
          examDate: '2024-03-10',
          units: [{
            unitId: 'unit-math-focus',
            unitNumber: 1,
            unitName: 'Algebra',
            initialStatus: 'new',
            activities: [{
              activityId: 'act-math-focus',
              activityType: 'theory_1',
              enabled: true,
              status: 'not_started',
              weight: 1,
              estimatedSessions: 4,
              completedSessions: 0,
            }],
          }],
        }),
        makeSubject({
          subjectId: 'sub-physics-maintenance',
          subjectName: 'Physics',
          examDate: '2024-03-20',
          units: [{
            unitId: 'unit-physics-maintenance',
            unitNumber: 1,
            unitName: 'Mechanics',
            initialStatus: 'new',
            activities: [{
              activityId: 'act-physics-maintenance',
              activityType: 'theory_1',
              enabled: true,
              status: 'not_started',
              weight: 1,
              estimatedSessions: 10,
              completedSessions: 0,
            }],
          }],
        }),
      ],
    })

    const output = generatePlan(input)
    const physics = output.sessions.filter((session) => session.subjectId === 'sub-physics-maintenance')
    expect(physics.length).toBe(0)
  })

  it('is deterministic — same input produces same output', () => {
    const input = makeInput({ subjects: twoSubjects() })
    const out1 = generatePlan(input)
    const out2 = generatePlan(input)
    expect(out1.sessions.map(s => s.requirementId).sort()).toEqual(
      out2.sessions.map(s => s.requirementId).sort()
    )
  })
})

describe('reschedulePlan', () => {
  it('preserves completed sessions and does not reschedule them', () => {
    const input = makeInput({
      season: { startDate: TODAY, endDate: '2024-03-15' },
      subjects: [
        {
          ...makeSubject(),
          units: [
            {
              unitId: 'unit-1',
              unitNumber: 1,
              unitName: 'Algebra',
              initialStatus: 'new',
              activities: [
                // 1 completed + 1 remaining
                { activityId: 'act-t1', activityType: 'theory_1', enabled: true, status: 'in_progress', weight: 1, estimatedSessions: 2, completedSessions: 1 },
              ],
            },
          ],
        },
      ],
    })

    const completedSlot = {
      sessionId: 'sess-completed',
      activityId: 'act-t1',
      subjectId: 'sub-1',
      subjectName: 'Mathematics',
      examDate: '2024-03-15',
      color: '#3B82F6',
      unitId: 'unit-1',
      unitNumber: 1,
      unitName: 'Algebra',
      activityType: 'theory_1' as const,
      scheduledDate: TODAY,
      slotName: 'Morning',
      startTime: '09:00:00',
      endTime: '11:00:00',
      position: 1,
      estimatedDurationMinutes: 120,
      status: 'completed' as const,
    }

    const result = reschedulePlan({ ...input, existingPlan: [completedSlot] })

    // The completed session must appear in preserved
    expect(result.preserved.length).toBe(1)
    expect(result.preserved[0].activityId).toBe('act-t1')

    // The preserved slot should not be used again
    const completedKey = `${TODAY}__Morning`
    const newSession = result.rescheduled.find(
      s => `${s.scheduledDate}__${s.slotName}` === completedKey
    )
    expect(newSession).toBeUndefined()
  })

  it('still schedules remaining work after preserving completed sessions', () => {
    const input = makeInput({
      season: { startDate: TODAY, endDate: '2024-03-15' },
      subjects: [makeSubject()],
    })

    const result = reschedulePlan({ ...input, existingPlan: [] })
    // No completed sessions → everything scheduled fresh
    expect(result.rescheduled.length).toBeGreaterThanOrEqual(1)
    expect(result.preserved.length).toBe(0)
  })
})

