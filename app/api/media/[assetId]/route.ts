import { requireAuth } from '@/lib/auth/session'
import { authorizedMediaUrl, completeMediaUpload } from '@/services/media.service'

export async function PATCH(_request: Request, { params }: { params: Promise<{ assetId: string }> }) {
  try { const user = await requireAuth(); const { assetId } = await params; return Response.json({ asset: await completeMediaUpload(user.id, assetId) }) }
  catch (error) { const message = error instanceof Error ? error.message : 'Unable to complete upload'; return Response.json({ error: message }, { status: message === 'Unauthorized' ? 401 : 400 }) }
}
export async function GET(_request: Request, { params }: { params: Promise<{ assetId: string }> }) {
  try { const user = await requireAuth(); const url = await authorizedMediaUrl(user.id, (await params).assetId); return url ? Response.redirect(url, 302) : Response.json({ error: 'Asset not found' }, { status: 404 }) }
  catch (error) { const message = error instanceof Error ? error.message : 'Unable to retrieve asset'; return Response.json({ error: message }, { status: message === 'Unauthorized' ? 401 : 400 }) }
}
