import { describe, expect, it } from 'vitest'
import { isExamUpcoming, selectNextExam } from './utils'

describe('exam date selection', () => {
  it('does not treat today as upcoming after the 10:00 local cutoff', () => {
    // 19:55 in Asia/Kolkata on 13 Nov 2026.
    const evening = new Date('2026-11-13T14:25:00.000Z')

    expect(isExamUpcoming('2026-11-13', evening)).toBe(false)
    expect(selectNextExam([
      { name: 'Today', examDate: '2026-11-13' },
      { name: 'Tomorrow', examDate: '2026-11-14' },
    ], evening)?.name).toBe('Tomorrow')
  })

  it('keeps today upcoming before the cutoff', () => {
    // 09:55 in Asia/Kolkata on 13 Nov 2026.
    const morning = new Date('2026-11-13T04:25:00.000Z')

    expect(isExamUpcoming('2026-11-13', morning)).toBe(true)
  })
})
