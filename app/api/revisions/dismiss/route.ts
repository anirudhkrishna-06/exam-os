import { requireAuth } from '@/lib/auth/session'
import { dismissRevisionSuggestion } from '@/services/revision.service'

export async function POST(request: Request) {
  try {
    const user = await requireAuth(); const body = await request.json()
    if (!body.activityId || !body.suggestedDate) return Response.json({ error: 'Activity and date are required' }, { status: 400 })
    await dismissRevisionSuggestion(user.id, body.activityId, body.suggestedDate)
    return Response.json({ success: true })
  } catch (error) { const message = error instanceof Error ? error.message : 'Failed'; return Response.json({ error: message }, { status: message === 'Unauthorized' ? 401 : 400 }) }
}
