import { describe, expect, it } from 'vitest'
import { bulkSaveScheduleSlotsSchema } from './settings'

describe('bulkSaveScheduleSlotsSchema', () => {
  it('normalizes PostgreSQL time values that include seconds', () => {
    const result = bulkSaveScheduleSlotsSchema.parse({
      slots: [{
        name: 'Morning',
        startTime: '06:00:00',
        endTime: '08:00:00',
        position: 0,
        isEnabled: true,
      }],
      defaultSessionsPerDay: 1,
    })

    expect(result.slots[0].startTime).toBe('06:00')
    expect(result.slots[0].endTime).toBe('08:00')
  })
})
