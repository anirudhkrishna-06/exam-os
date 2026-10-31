// ============================================================
// modules/planner/__tests__/slot-generator.test.ts
// ============================================================

import { describe, it, expect } from 'vitest'
import { generateSlots } from '../slot-generator'
import { makeInput, TODAY } from './fixtures'

describe('generateSlots', () => {
  it('generates slots for each day within the season window', () => {
    // 2 days from today, 4 slots/day = 8 slots
    const input = makeInput({
      season: { startDate: TODAY, endDate: '2024-03-02' },
      defaultSessionsPerDay: 4,
    })
    const slots = generateSlots(input)
    // 2024-03-01 and 2024-03-02 — 4 slots each
    expect(slots.length).toBe(8)
  })

  it('marks rest days as having 0 slots', () => {
    const input = makeInput({
      season: { startDate: TODAY, endDate: '2024-03-03' },
      capacityOverrides: [{ date: '2024-03-02', sessionCount: 0, isRestDay: true }],
    })
    const slots = generateSlots(input)
    const mar2Slots = slots.filter(s => s.date === '2024-03-02')
    expect(mar2Slots.length).toBe(0)
  })

  it('skips exam dates by default', () => {
    const input = makeInput({
      season: { startDate: TODAY, endDate: '2024-03-15' },
      subjects: [{
        subjectId: 'sub-1',
        subjectName: 'Math',
        examDate: '2024-03-05',
        color: '#000',
        units: [],
      }],
    })
    const slots = generateSlots(input)
    const examDaySlots = slots.filter(s => s.date === '2024-03-05')
    expect(examDaySlots.length).toBe(0)
  })

  it('respects capacity override session count', () => {
    const input = makeInput({
      season: { startDate: TODAY, endDate: '2024-03-01' },
      defaultSessionsPerDay: 4,
      capacityOverrides: [{ date: TODAY, sessionCount: 2, isRestDay: false }],
    })
    const slots = generateSlots(input)
    expect(slots.length).toBe(2)
  })

  it('uses slot overrides when present for a date', () => {
    const input = makeInput({
      season: { startDate: TODAY, endDate: '2024-03-01' },
      slotOverrides: [
        {
          date: TODAY,
          templateId: 'slot-1',
          slotName: 'Custom Morning',
          startTime: '08:00:00',
          endTime: '10:00:00',
          isAvailable: true,
          position: 1,
        },
        {
          date: TODAY,
          templateId: 'slot-2',
          slotName: 'Custom Evening',
          startTime: '18:00:00',
          endTime: '20:00:00',
          isAvailable: false,  // disabled
          position: 2,
        },
      ],
    })
    const slots = generateSlots(input)
    // Only the available override should be returned
    expect(slots.length).toBe(1)
    expect(slots[0].slotName).toBe('Custom Morning')
  })

  it('returns slots sorted by date ascending', () => {
    const input = makeInput({
      season: { startDate: TODAY, endDate: '2024-03-03' },
      defaultSessionsPerDay: 1,
    })
    const slots = generateSlots(input)
    const dates = slots.map(s => s.date)
    const sorted = [...dates].sort()
    expect(dates).toEqual(sorted)
  })

  it('caps slots at defaultSessionsPerDay', () => {
    const input = makeInput({
      season: { startDate: TODAY, endDate: '2024-03-01' },
      defaultSessionsPerDay: 2,  // only 2, even though 5 templates are enabled
    })
    const slots = generateSlots(input)
    expect(slots.length).toBe(2)
  })

  it('rotates capped sessions across the configured day', () => {
    const input = makeInput({
      season: { startDate: TODAY, endDate: '2024-03-03' },
      defaultSessionsPerDay: 4,
    })
    const slots = generateSlots(input)

    const dayOne = slots.filter(s => s.date === TODAY).map(s => s.position)
    const dayTwo = slots.filter(s => s.date === '2024-03-02').map(s => s.position)
    const dayThree = slots.filter(s => s.date === '2024-03-03').map(s => s.position)

    expect(dayOne).toEqual([1, 2, 3, 4])
    expect(dayTwo).toEqual([2, 3, 4, 5])
    expect(dayThree).toEqual([1, 3, 4, 5])
  })
})

