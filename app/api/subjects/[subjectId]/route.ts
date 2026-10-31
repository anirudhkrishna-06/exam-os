import { requireAuth } from '@/lib/auth/session'
import { updateSubjectSchema } from '@/lib/validation/subjects'
import { getSubjectById, updateSubject, deleteSubject } from '@/services/subject.service'

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ subjectId: string }> }
) {
  try {
    const user = await requireAuth()
    const { subjectId } = await params
    const subject = await getSubjectById(user.id, subjectId)
    if (!subject) return Response.json({ error: 'Not found' }, { status: 404 })
    return Response.json({ subject })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed'
    if (message === 'Unauthorized') return Response.json({ error: message }, { status: 401 })
    return Response.json({ error: message }, { status: 500 })
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ subjectId: string }> }
) {
  try {
    const user = await requireAuth()
    const { subjectId } = await params
    const body = await request.json()
    const parsed = updateSubjectSchema.safeParse(body)

    if (!parsed.success) {
      return Response.json({ error: 'Validation failed', details: parsed.error.flatten() }, { status: 400 })
    }

    const subject = await updateSubject(user.id, subjectId, parsed.data)
    return Response.json({ subject })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed'
    if (message === 'Unauthorized') return Response.json({ error: message }, { status: 401 })
    return Response.json({ error: message }, { status: 500 })
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ subjectId: string }> }
) {
  try {
    const user = await requireAuth()
    const { subjectId } = await params
    await deleteSubject(user.id, subjectId)
    return Response.json({ success: true })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed'
    if (message === 'Unauthorized') return Response.json({ error: message }, { status: 401 })
    return Response.json({ error: message }, { status: 500 })
  }
}
