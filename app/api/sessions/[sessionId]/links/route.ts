import { requireAuth } from '@/lib/auth/session'
import { addSessionLink, removeSessionLink } from '@/services/knowledge.service'

export async function POST(request: Request, { params }: { params: Promise<{ sessionId: string }> }) {
  try { const user = await requireAuth(); const { sessionId } = await params; const body = await request.json(); const link = await addSessionLink(user.id, sessionId, { url: String(body.url), nickname: String(body.nickname), category: String(body.category || 'Other') }); return Response.json({ link }, { status: 201 }) }
  catch (error) { const message = error instanceof Error ? error.message : 'Failed'; return Response.json({ error: message }, { status: message === 'Unauthorized' ? 401 : 400 }) }
}

export async function DELETE(request: Request) {
  try { const user = await requireAuth(); const id = new URL(request.url).searchParams.get('id'); if (!id) return Response.json({ error: 'Link id is required' }, { status: 400 }); await removeSessionLink(user.id, id); return Response.json({ success: true }) }
  catch (error) { const message = error instanceof Error ? error.message : 'Failed'; return Response.json({ error: message }, { status: message === 'Unauthorized' ? 401 : 400 }) }
}
