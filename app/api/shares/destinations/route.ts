import { requireAuth } from '@/lib/auth/session'
import { getRecipientDestinations } from '@/services/sharing.service'

export async function GET() {
  try { return Response.json({ subjects: await getRecipientDestinations((await requireAuth()).id) }) }
  catch (error) { const message = error instanceof Error ? error.message : 'Failed'; return Response.json({ error: message }, { status: message === 'Unauthorized' ? 401 : 500 }) }
}
