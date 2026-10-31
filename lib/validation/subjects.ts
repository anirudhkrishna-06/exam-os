import { z } from 'zod'

export const createSubjectSchema = z.object({
  seasonId: z.string().uuid(),
  name: z.string().min(1, 'Subject name is required').max(255),
  examDate: z.string().date('Invalid exam date'),
  color: z.string().max(20).optional(),
  position: z.number().int().min(0).optional(),
})

export const updateSubjectSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  examDate: z.string().date().optional(),
  color: z.string().max(20).optional(),
  position: z.number().int().min(0).optional(),
})

export const updateUnitSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  initialStatus: z.enum(['new', 'partially_studied', 'previously_studied']).optional(),
})

export const updateActivitySchema = z.object({
  enabled: z.boolean().optional(),
  weight: z.number().min(0).max(100).optional(),
  estimatedSessions: z.number().int().min(1).max(50).optional(),
  status: z.enum(['not_started', 'in_progress', 'completed']).optional(),
})

export const bulkUpdateUnitsSchema = z.object({
  initialStatus: z.enum(['new', 'partially_studied', 'previously_studied']),
})

export const bulkUpdateActivitiesSchema = z.object({
  activityType: z.enum(['theory_1', 'theory_2', 'numericals', 'previous_papers', 'revision']),
  enabled: z.boolean(),
})

export type CreateSubjectInput = z.infer<typeof createSubjectSchema>
export type UpdateSubjectInput = z.infer<typeof updateSubjectSchema>
export type UpdateUnitInput = z.infer<typeof updateUnitSchema>
export type UpdateActivityInput = z.infer<typeof updateActivitySchema>

