import { requireAuth } from '@/lib/auth/session'
import { getSubjectGallery } from '@/services/media.service'

export async function GET(_request: Request, { params }: { params: Promise<{ subjectId: string }> }) {
  try { const user = await requireAuth(); const gallery = await getSubjectGallery(user.id, (await params).subjectId); return gallery ? Response.json(gallery) : Response.json({ error: 'Subject not found' }, { status: 404 }) }
  catch (error) { const message = error instanceof Error ? error.message : 'Unable to load gallery'; return Response.json({ error: message }, { status: message === 'Unauthorized' ? 401 : 500 }) }
}
