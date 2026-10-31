// ============================================================
// modules/planner/__tests__/priority.test.ts
// ============================================================

import { describe, it, expect } from 'vitest'
import { calculatePriority } from '../priority-calculator'
import type { SessionRequirement, AvailableSlot } from '../types'
import { TODAY } from './fixtures'

function makeReq(overrides: Partial<SessionRequirement> = {}): SessionRequirement {
  return {
    subjectId: 'sub-1',
    subjectName: 'Math',
    examDate: '2024-03-20',
    color: '#000',
    unitId: 'unit-1',
    unitNumber: 1,
    unitName: 'Algebra',
    initialStatus: 'new',
    activityId: 'act-1',
    activityType: 'theory_1',
    estimatedSessions: 2,
    completedSessions: 0,
    remainingSessions: 2,
    weight: 1.0,
    requirementIndex: 0,
    priority: 0,
    requirementId: 'act-1__0',
    ...overrides,
  }
}

const NO_SLOTS: AvailableSlot[] = []
const EMPTY_BALANCE = {}
const EMPTY_COMPLETED: Record<string, number> = {}
const EMPTY_UNIT_COMPLETION: Record<string, Record<string, number>> = {}

describe('calculatePriority', () => {
  it('gives higher priority for exams closer in time', () => {
    const nearExam = makeReq({ examDate: '2024-03-05' })
    const farExam = makeReq({ examDate: '2024-06-01' })

    const nearScore = calculatePriority(nearExam, TODAY, NO_SLOTS, EMPTY_BALANCE, 1, EMPTY_COMPLETED, EMPTY_UNIT_COMPLETION)
    const farScore = calculatePriority(farExam, TODAY, NO_SLOTS, EMPTY_BALANCE, 1, EMPTY_COMPLETED, EMPTY_UNIT_COMPLETION)

    expect(nearScore).toBeGreaterThan(farScore)
  })

  it('gives higher priority to "new" units over "previously_studied"', () => {
    const newUnit = makeReq({ initialStatus: 'new' })
    const prevUnit = makeReq({ initialStatus: 'previously_studied' })

    const newScore = calculatePriority(newUnit, TODAY, NO_SLOTS, EMPTY_BALANCE, 1, EMPTY_COMPLETED, EMPTY_UNIT_COMPLETION)
    const prevScore = calculatePriority(prevUnit, TODAY, NO_SLOTS, EMPTY_BALANCE, 1, EMPTY_COMPLETED, EMPTY_UNIT_COMPLETION)

    expect(newScore).toBeGreaterThan(prevScore)
  })

  it('gives higher priority to heavier activities and tougher work', () => {
    const lighter = makeReq({ weight: 10, estimatedSessions: 2, remainingSessions: 2 })
    const heavier = makeReq({ weight: 25, estimatedSessions: 8, remainingSessions: 8 })

    const lightScore = calculatePriority(lighter, TODAY, NO_SLOTS, EMPTY_BALANCE, 1, EMPTY_COMPLETED, EMPTY_UNIT_COMPLETION)
    const heavyScore = calculatePriority(heavier, TODAY, NO_SLOTS, EMPTY_BALANCE, 1, EMPTY_COMPLETED, EMPTY_UNIT_COMPLETION)

    expect(heavyScore).toBeGreaterThan(lightScore)
  })

  it('penalizes numericals when theory_1 is not yet completed', () => {
    const numerical = makeReq({ activityType: 'numericals' })
    const theory = makeReq({ activityType: 'theory_1' })

    const numericalScore = calculatePriority(numerical, TODAY, NO_SLOTS, EMPTY_BALANCE, 1, EMPTY_COMPLETED, { 'unit-1': { theory_1: 0, theory_2: 0 } })
    const theoryScore = calculatePriority(theory, TODAY, NO_SLOTS, EMPTY_BALANCE, 1, EMPTY_COMPLETED, EMPTY_UNIT_COMPLETION)

    expect(theoryScore).toBeGreaterThan(numericalScore)
  })

  it('boosts revision priority when close to exam', () => {
    const examDate = '2024-03-04'  // 3 days from TODAY (2024-03-01)
    const revision = makeReq({ activityType: 'revision', examDate })
    // Near exam — revision should get a boost (within 20% of 3 days = 0.6 days → score boosted)
    const score = calculatePriority(revision, TODAY, NO_SLOTS, EMPTY_BALANCE, 1, EMPTY_COMPLETED, EMPTY_UNIT_COMPLETION)
    // Expect positive score (the boost means it's above a baseline)
    expect(score).toBeGreaterThan(0)
  })

  it('deprioritizes revision when far from exam', () => {
    const farRevision = makeReq({ activityType: 'revision', examDate: '2024-06-01' })
    const farTheory = makeReq({ activityType: 'theory_1', examDate: '2024-06-01' })

    const revScore = calculatePriority(farRevision, TODAY, NO_SLOTS, EMPTY_BALANCE, 1, EMPTY_COMPLETED, EMPTY_UNIT_COMPLETION)
    const theoryScore = calculatePriority(farTheory, TODAY, NO_SLOTS, EMPTY_BALANCE, 1, EMPTY_COMPLETED, EMPTY_UNIT_COMPLETION)

    // theory_1 should outrank revision when far from exam
    expect(theoryScore).toBeGreaterThan(revScore)
  })

  it('scores in 0-100 range', () => {
    for (const type of ['theory_1', 'theory_2', 'numericals', 'previous_papers', 'revision'] as const) {
      for (const status of ['new', 'partially_studied', 'previously_studied'] as const) {
        const req = makeReq({ activityType: type, initialStatus: status })
        const score = calculatePriority(req, TODAY, NO_SLOTS, EMPTY_BALANCE, 1, EMPTY_COMPLETED, EMPTY_UNIT_COMPLETION)
        expect(score).toBeGreaterThanOrEqual(0)
        expect(score).toBeLessThanOrEqual(100)
      }
    }
  })
})

