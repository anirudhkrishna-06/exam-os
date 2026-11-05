import { requireAuth } from '@/lib/auth/session'
import { removeImport } from '@/services/sharing.service'

export async function DELETE(_request: Request, { params }: { params: Promise<{ importId: string }> }) {
  try { const user = await requireAuth(); const { importId } = await params; await removeImport(user.id, importId); return Response.json({ success: true }) }
  catch (error) { const message = error instanceof Error ? error.message : 'Failed'; return Response.json({ error: message }, { status: message === 'Unauthorized' ? 401 : 400 }) }
}
