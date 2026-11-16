import { requireAuth } from '@/lib/auth/session'
import { addEquationVariable, removeEquationBookmark, removeEquationVariable, updateEquationBookmark } from '@/services/knowledge.service'

export async function PATCH(request: Request, { params }: { params: Promise<{ equationId: string }> }) {
  try { const user = await requireAuth(); const body = await request.json(); return Response.json({ equation: await updateEquationBookmark(user.id, (await params).equationId, { label: body.label === undefined ? undefined : String(body.label), groupId: Object.prototype.hasOwnProperty.call(body, 'groupId') ? (body.groupId ? String(body.groupId) : null) : undefined }) }) }
  catch (error) { const message = error instanceof Error ? error.message : 'Failed'; return Response.json({ error: message }, { status: message === 'Unauthorized' ? 401 : 400 }) }
}

export async function POST(request: Request, { params }: { params: Promise<{ equationId: string }> }) {
  try { const user = await requireAuth(); const body = await request.json(); return Response.json({ variable: await addEquationVariable(user.id, (await params).equationId, String(body.symbol ?? ''), String(body.explanation ?? ''), String(body.notation ?? 'plain')) }, { status: 201 }) }
  catch (error) { const message = error instanceof Error ? error.message : 'Failed'; return Response.json({ error: message }, { status: message === 'Unauthorized' ? 401 : 400 }) }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ equationId: string }> }) {
  try { const user = await requireAuth(); const id = (await params).equationId; const variableId = new URL(request.url).searchParams.get('variableId'); if (variableId) await removeEquationVariable(user.id, variableId); else await removeEquationBookmark(user.id, id); return Response.json({ ok: true }) }
  catch (error) { const message = error instanceof Error ? error.message : 'Failed'; return Response.json({ error: message }, { status: message === 'Unauthorized' ? 401 : 400 }) }
}
