import { requireAuth } from '@/lib/auth/session'
import { revokeExternalShare, updateExternalShare } from '@/services/sharing.service'

export async function PATCH(_request: Request, { params }: { params: Promise<{ shareId: string }> }) {
  try { await updateExternalShare((await requireAuth()).id, (await params).shareId); return Response.json({ success: true }, { headers: { 'Cache-Control': 'private, no-store' } }) }
  catch (error) { const message = error instanceof Error ? error.message : 'Failed'; return Response.json({ error: message }, { status: message === 'Unauthorized' ? 401 : 400 }) }
}
export async function DELETE(_request: Request, { params }: { params: Promise<{ shareId: string }> }) {
  try { await revokeExternalShare((await requireAuth()).id, (await params).shareId, true); return Response.json({ success: true }) }
  catch (error) { const message = error instanceof Error ? error.message : 'Failed'; return Response.json({ error: message }, { status: message === 'Unauthorized' ? 401 : 400 }) }
}
