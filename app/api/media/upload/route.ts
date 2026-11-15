import { requireAuth } from '@/lib/auth/session'
import { prepareMediaUpload } from '@/services/media.service'

export async function POST(request: Request) {
  try { const user = await requireAuth(); const body = await request.json(); return Response.json(await prepareMediaUpload(user.id, { filename: String(body.filename ?? ''), mimeType: String(body.mimeType ?? ''), size: Number(body.size), width: body.width ? Number(body.width) : undefined, height: body.height ? Number(body.height) : undefined })) }
  catch (error) { const message = error instanceof Error ? error.message : 'Unable to prepare upload'; return Response.json({ error: message }, { status: message === 'Unauthorized' ? 401 : 400 }) }
}
