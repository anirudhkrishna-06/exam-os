import { requireAuth } from '@/lib/auth/session'
import { groupEquationBookmarks } from '@/services/knowledge.service'

export async function POST(request: Request) {
  try {
    const user = await requireAuth()
    const body = await request.json()
    return Response.json({ group: await groupEquationBookmarks(user.id, Array.isArray(body.equationIds) ? body.equationIds.map(String) : []) }, { status: 201 })
  } catch (error) { const message = error instanceof Error ? error.message : 'Failed'; return Response.json({ error: message }, { status: message === 'Unauthorized' ? 401 : 400 }) }
}
