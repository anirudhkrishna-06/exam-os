import { requireAuth } from '@/lib/auth/session'
import { acceptShare } from '@/services/sharing.service'

export async function POST(request: Request, { params }: { params: Promise<{ shareId: string }> }) {
  try { const user = await requireAuth(); const body = await request.json(); const { shareId } = await params; return Response.json(await acceptShare(user.id, shareId, String(body.subjectId ?? ''), String(body.unitId ?? '')), { status: 201 }) }
  catch (error) { const message = error instanceof Error ? error.message : 'Failed'; return Response.json({ error: message }, { status: message === 'Unauthorized' ? 401 : 400 }) }
}
