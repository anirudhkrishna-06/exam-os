import { requireAuth } from '@/lib/auth/session'
import { declineShare } from '@/services/sharing.service'

export async function POST(_request: Request, { params }: { params: Promise<{ shareId: string }> }) {
  try { const user = await requireAuth(); const { shareId } = await params; await declineShare(user.id, shareId); return Response.json({ success: true }) }
  catch (error) { const message = error instanceof Error ? error.message : 'Failed'; return Response.json({ error: message }, { status: message === 'Unauthorized' ? 401 : 400 }) }
}
