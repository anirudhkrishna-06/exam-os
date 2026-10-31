import { z } from 'zod'

export const createSeasonSchema = z.object({
  name: z.string().min(1, 'Season name is required').max(255),
  startDate: z.string().date('Invalid start date'),
  subjects: z.array(z.object({
    name: z.string().min(1, 'Subject name is required').max(255),
    examDate: z.string().date('Invalid exam date'),
    color: z.string().max(20).optional(),
  })).min(1, 'At least one subject is required'),
}).superRefine((data, ctx) => {
  const seenNames = new Set<string>()
  data.subjects.forEach((subject, i) => {
    const lower = subject.name.toLowerCase()
    if (seenNames.has(lower)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Duplicate subject name',
        path: ['subjects', i, 'name'],
      })
    }
    seenNames.add(lower)

    if (subject.examDate < data.startDate) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Exam date must be on or after the preparation start date',
        path: ['subjects', i, 'examDate'],
      })
    }
  })
})

export const updateSeasonSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  startDate: z.string().date().optional(),
  status: z.enum(['draft', 'active', 'completed', 'archived']).optional(),
})

export type CreateSeasonInput = z.infer<typeof createSeasonSchema>
export type UpdateSeasonInput = z.infer<typeof updateSeasonSchema>

