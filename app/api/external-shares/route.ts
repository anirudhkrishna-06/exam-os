import { requireAuth } from '@/lib/auth/session'
import { createExternalShare, listExternalShares } from '@/services/sharing.service'

export async function GET(request: Request) {
  try { const user = await requireAuth(); const sessionId = new URL(request.url).searchParams.get('sessionId') ?? ''; return Response.json(await listExternalShares(user.id, sessionId), { headers: { 'Cache-Control': 'private, no-store' } }) }
  catch (error) { const message = error instanceof Error ? error.message : 'Failed'; return Response.json({ error: message }, { status: message === 'Unauthorized' ? 401 : 400 }) }
}

export async function POST(request: Request) {
  try { const user = await requireAuth(); const body = await request.json(); const result = await createExternalShare(user.id, String(body.sessionId ?? ''), String(body.passcode ?? ''), body.expiresAt ? String(body.expiresAt) : null); return Response.json({ ...result, url: `${new URL(request.url).origin}/s/${result.token}` }, { status: 201, headers: { 'Cache-Control': 'private, no-store' } }) }
  catch (error) { const message = error instanceof Error ? error.message : 'Failed'; return Response.json({ error: message }, { status: message === 'Unauthorized' ? 401 : 400 }) }
}
