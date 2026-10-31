import { requireAuth } from '@/lib/auth/session'
import { updateUnitSchema } from '@/lib/validation/subjects'
import { updateUnit } from '@/services/syllabus.service'

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ unitId: string }> }
) {
  try {
    const user = await requireAuth()
    const { unitId } = await params
    const body = await request.json()
    const parsed = updateUnitSchema.safeParse(body)

    if (!parsed.success) {
      return Response.json({ error: 'Validation failed', details: parsed.error.flatten() }, { status: 400 })
    }

    const unit = await updateUnit(user.id, unitId, parsed.data)
    return Response.json({ unit })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed'
    if (message === 'Unauthorized') return Response.json({ error: message }, { status: 401 })
    return Response.json({ error: message }, { status: 500 })
  }
}
