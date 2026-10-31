import { requireAuth } from '@/lib/auth/session'
import { updateSeasonSchema } from '@/lib/validation/seasons'
import { getSeasonById, updateSeason, deleteSeason } from '@/services/season.service'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ seasonId: string }> }
) {
  try {
    const user = await requireAuth()
    const { seasonId } = await params
    const season = await getSeasonById(user.id, seasonId)

    if (!season) return Response.json({ error: 'Season not found' }, { status: 404 })
    return Response.json({ season })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed'
    if (message === 'Unauthorized') return Response.json({ error: message }, { status: 401 })
    return Response.json({ error: message }, { status: 500 })
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ seasonId: string }> }
) {
  try {
    const user = await requireAuth()
    const { seasonId } = await params
    const body = await request.json()
    const parsed = updateSeasonSchema.safeParse(body)

    if (!parsed.success) {
      return Response.json({ error: 'Validation failed', details: parsed.error.flatten() }, { status: 400 })
    }

    const season = await updateSeason(user.id, seasonId, parsed.data)
    if (!season) return Response.json({ error: 'Season not found' }, { status: 404 })
    return Response.json({ season })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed'
    if (message === 'Unauthorized') return Response.json({ error: message }, { status: 401 })
    return Response.json({ error: message }, { status: 500 })
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ seasonId: string }> }
) {
  try {
    const user = await requireAuth()
    const { seasonId } = await params
    await deleteSeason(user.id, seasonId)
    return Response.json({ success: true })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed'
    if (message === 'Unauthorized') return Response.json({ error: message }, { status: 401 })
    return Response.json({ error: message }, { status: 500 })
  }
}
