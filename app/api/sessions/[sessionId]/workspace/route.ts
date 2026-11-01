import { requireAuth } from '@/lib/auth/session'
import { getSessionWorkspace, saveSessionNote } from '@/services/knowledge.service'

export async function GET(_request: Request, { params }: { params: Promise<{ sessionId: string }> }) {
  try {
    const user = await requireAuth(); const { sessionId } = await params
    const workspace = await getSessionWorkspace(user.id, sessionId)
    if (!workspace) return Response.json({ error: 'Session not found' }, { status: 404 })
    return Response.json(workspace)
  } catch (error) { const message = error instanceof Error ? error.message : 'Failed'; return Response.json({ error: message }, { status: message === 'Unauthorized' ? 401 : 500 }) }
}

export async function PATCH(request: Request, { params }: { params: Promise<{ sessionId: string }> }) {
  try {
    const user = await requireAuth(); const { sessionId } = await params; const body = await request.json()
    const note = await saveSessionNote(user.id, sessionId, String(body.title ?? ''), String(body.content ?? ''))
    return Response.json({ note })
  } catch (error) { const message = error instanceof Error ? error.message : 'Failed'; return Response.json({ error: message }, { status: message === 'Unauthorized' ? 401 : 400 }) }
}
