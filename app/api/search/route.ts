import { requireAuth } from '@/lib/auth/session'
import { searchKnowledge } from '@/services/search.service'

export async function GET(request: Request) {
  try { const user = await requireAuth(); const query = new URL(request.url).searchParams.get('q') ?? ''; return Response.json({ results: await searchKnowledge(user.id, query) }) }
  catch (error) { const message = error instanceof Error ? error.message : 'Failed'; return Response.json({ error: message }, { status: message === 'Unauthorized' ? 401 : 500 }) }
}
