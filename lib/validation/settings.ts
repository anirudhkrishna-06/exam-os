import { z } from 'zod'

const timeSchema = z.string()
  .regex(/^\d{2}:\d{2}(:\d{2})?$/, 'Invalid time format (HH:MM)')
  .transform((value) => value.slice(0, 5))

export const updatePreferencesSchema = z.object({
  timezone: z.string().max(100).optional(),
  defaultSessionsPerDay: z.number().int().min(1).max(20).optional(),
})

export const createScheduleSlotSchema = z.object({
  name: z.string().min(1, 'Slot name is required').max(100),
  startTime: timeSchema,
  endTime: timeSchema,
  position: z.number().int().min(0),
  isEnabled: z.boolean().optional(),
}).refine((data) => data.startTime < data.endTime, {
  message: 'Start time must be before end time',
  path: ['endTime'],
})

export const updateScheduleSlotSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  startTime: timeSchema.optional(),
  endTime: timeSchema.optional(),
  position: z.number().int().min(0).optional(),
  isEnabled: z.boolean().optional(),
}).refine((data) => {
  if (data.startTime && data.endTime) {
    return data.startTime < data.endTime
  }
  return true
}, {
  message: 'Start time must be before end time',
  path: ['endTime'],
})

export const bulkSaveScheduleSlotsSchema = z.object({
  slots: z.array(z.object({
    id: z.string().uuid().optional(),
    name: z.string().min(1).max(100),
    startTime: timeSchema,
    endTime: timeSchema,
    position: z.number().int().min(0),
    isEnabled: z.boolean(),
  })).refine((slots) => {
    // Check for overlapping time slots
    const enabled = slots.filter(s => s.isEnabled)
    for (let i = 0; i < enabled.length; i++) {
      for (let j = i + 1; j < enabled.length; j++) {
        const a = enabled[i]
        const b = enabled[j]
        if (a.startTime < b.endTime && b.startTime < a.endTime) {
          return false
        }
      }
    }
    return true
  }, 'Time slots cannot overlap'),
  defaultSessionsPerDay: z.number().int().min(1).max(20),
})

export type UpdatePreferencesInput = z.infer<typeof updatePreferencesSchema>
export type CreateScheduleSlotInput = z.infer<typeof createScheduleSlotSchema>
export type BulkSaveSlotsInput = z.infer<typeof bulkSaveScheduleSlotsSchema>

