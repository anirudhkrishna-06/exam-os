import { requireAuth } from '@/lib/auth/session'
import { revokeExternalShare } from '@/services/sharing.service'
export async function POST(_request: Request, { params }: { params: Promise<{ shareId: string }> }) {
  try { await revokeExternalShare((await requireAuth()).id, (await params).shareId); return Response.json({ success: true }) }
  catch (error) { const message = error instanceof Error ? error.message : 'Failed'; return Response.json({ error: message }, { status: message === 'Unauthorized' ? 401 : 400 }) }
}
