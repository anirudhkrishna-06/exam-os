import { requireAuth } from '@/lib/auth/session'
import { createSubjectSchema, updateSubjectSchema } from '@/lib/validation/subjects'
import { createSubject, updateSubject, deleteSubject } from '@/services/subject.service'

export async function POST(request: Request) {
  try {
    const user = await requireAuth()
    const body = await request.json()
    const parsed = createSubjectSchema.safeParse(body)

    if (!parsed.success) {
      return Response.json({ error: 'Validation failed', details: parsed.error.flatten() }, { status: 400 })
    }

    const subject = await createSubject(user.id, {
      ...parsed.data,
      position: parsed.data.position ?? 0,
    })
    return Response.json({ subject }, { status: 201 })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed'
    if (message === 'Unauthorized') return Response.json({ error: message }, { status: 401 })
    return Response.json({ error: message }, { status: 500 })
  }
}

