import { requireAuth } from '@/lib/auth/session'
import { addEquationBookmark, listEquationBookmarks } from '@/services/knowledge.service'

export async function GET() {
  try { const user = await requireAuth(); return Response.json({ equations: await listEquationBookmarks(user.id) }) }
  catch (error) { const message = error instanceof Error ? error.message : 'Failed'; return Response.json({ error: message }, { status: message === 'Unauthorized' ? 401 : 500 }) }
}

export async function POST(request: Request) {
  try {
    const user = await requireAuth(); const body = await request.json()
    const equation = await addEquationBookmark(user.id, String(body.sessionId), String(body.expression), String(body.label ?? ''), Number(body.occurrence ?? 0))
    return Response.json({ equation }, { status: 201 })
  } catch (error) { const message = error instanceof Error ? error.message : 'Failed'; return Response.json({ error: message }, { status: message === 'Unauthorized' ? 401 : 400 }) }
}
