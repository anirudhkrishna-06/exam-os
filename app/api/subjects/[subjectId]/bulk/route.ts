import { requireAuth } from '@/lib/auth/session'
import { bulkUpdateUnitsForSubject, bulkUpdateActivitiesForSubject } from '@/services/syllabus.service'
import { z } from 'zod'

const bulkSchema = z.union([
  z.object({
    action: z.literal('set_unit_status'),
    initialStatus: z.enum(['new', 'partially_studied', 'previously_studied']),
  }),
  z.object({
    action: z.literal('set_activity_enabled'),
    activityType: z.enum(['theory_1', 'theory_2', 'numericals', 'previous_papers', 'revision']),
    enabled: z.boolean(),
  }),
])

export async function POST(
  request: Request,
  { params }: { params: Promise<{ subjectId: string }> }
) {
  try {
    const user = await requireAuth()
    const { subjectId } = await params
    const body = await request.json()
    const parsed = bulkSchema.safeParse(body)

    if (!parsed.success) {
      return Response.json({ error: 'Validation failed', details: parsed.error.flatten() }, { status: 400 })
    }

    if (parsed.data.action === 'set_unit_status') {
      await bulkUpdateUnitsForSubject(user.id, subjectId, parsed.data.initialStatus)
    } else {
      await bulkUpdateActivitiesForSubject(user.id, subjectId, parsed.data.activityType, parsed.data.enabled)
    }

    return Response.json({ success: true })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed'
    if (message === 'Unauthorized') return Response.json({ error: message }, { status: 401 })
    return Response.json({ error: message }, { status: 500 })
  }
}
