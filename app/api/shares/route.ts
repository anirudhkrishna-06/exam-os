import { requireAuth } from '@/lib/auth/session'
import { createSessionShare, getShareBox } from '@/services/sharing.service'

export async function GET() {
  try { return Response.json(await getShareBox((await requireAuth()).id)) }
  catch (error) { const message = error instanceof Error ? error.message : 'Failed'; return Response.json({ error: message }, { status: message === 'Unauthorized' ? 401 : 500 }) }
}

export async function POST(request: Request) {
  try {
    const user = await requireAuth(); const body = await request.json()
    return Response.json(await createSessionShare(user.id, String(body.sessionId ?? ''), String(body.email ?? ''), body.recipientUserId ? String(body.recipientUserId) : undefined), { status: 201 })
  } catch (error) { const message = error instanceof Error ? error.message : 'Failed'; return Response.json({ error: message }, { status: message === 'Unauthorized' ? 401 : 400 }) }
}
