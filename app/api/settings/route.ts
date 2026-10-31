import { requireAuth } from '@/lib/auth/session'
import { bulkSaveScheduleSlotsSchema } from '@/lib/validation/settings'
import { getPreferences, getScheduleSlots, saveScheduleSlots } from '@/services/preferences.service'

export async function GET() {
  try {
    const user = await requireAuth()
    const [prefs, slots] = await Promise.all([
      getPreferences(user.id),
      getScheduleSlots(user.id),
    ])
    return Response.json({ preferences: prefs, slots })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed'
    if (message === 'Unauthorized') return Response.json({ error: message }, { status: 401 })
    return Response.json({ error: message }, { status: 500 })
  }
}

export async function PUT(request: Request) {
  try {
    const user = await requireAuth()
    const body = await request.json()
    const parsed = bulkSaveScheduleSlotsSchema.safeParse(body)

    if (!parsed.success) {
      return Response.json({ error: 'Validation failed', details: parsed.error.flatten() }, { status: 400 })
    }

    const slots = await saveScheduleSlots(
      user.id,
      parsed.data.slots,
      parsed.data.defaultSessionsPerDay
    )
    return Response.json({ slots })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed'
    if (message === 'Unauthorized') return Response.json({ error: message }, { status: 401 })
    return Response.json({ error: message }, { status: 500 })
  }
}

