import { requireAuth } from '@/lib/auth/session'
import { addUnitNote, addUnitLink, addUnitKeyword } from '@/services/knowledge.service'

export async function POST(request: Request, { params }: { params: Promise<{ unitId: string }> }) {
  try {
    const user = await requireAuth(); const { unitId } = await params; const body = await request.json()
    if (body.type === 'note') return Response.json({ item: await addUnitNote(user.id, unitId, String(body.title ?? ''), String(body.content ?? '')) }, { status: 201 })
    if (body.type === 'link') return Response.json({ item: await addUnitLink(user.id, unitId, { url: String(body.url), nickname: String(body.nickname), category: String(body.category || 'Other') }) }, { status: 201 })
    if (body.type === 'keyword') return Response.json({ item: await addUnitKeyword(user.id, unitId, String(body.keyword ?? '')) }, { status: 201 })
    return Response.json({ error: 'Unknown knowledge type' }, { status: 400 })
  } catch (error) { const message = error instanceof Error ? error.message : 'Failed'; return Response.json({ error: message }, { status: message === 'Unauthorized' ? 401 : 400 }) }
}
