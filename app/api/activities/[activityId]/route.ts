import { requireAuth } from '@/lib/auth/session'
import { updateActivitySchema } from '@/lib/validation/subjects'
import { updateActivity } from '@/services/syllabus.service'

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ activityId: string }> }
) {
  try {
    const user = await requireAuth()
    const { activityId } = await params
    const body = await request.json()
    const parsed = updateActivitySchema.safeParse(body)

    if (!parsed.success) {
      return Response.json({ error: 'Validation failed', details: parsed.error.flatten() }, { status: 400 })
    }

    const activity = await updateActivity(user.id, activityId, parsed.data)
    return Response.json({ activity })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed'
    if (message === 'Unauthorized') return Response.json({ error: message }, { status: 401 })
    return Response.json({ error: message }, { status: 500 })
  }
}
