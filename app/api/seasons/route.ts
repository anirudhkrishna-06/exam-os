import { requireAuth } from '@/lib/auth/session'
import { createSeasonSchema } from '@/lib/validation/seasons'
import { createSeason, getSeasonsForUser } from '@/services/season.service'
import { createUnitsAndActivities } from '@/services/subject.service'
import { db } from '@/db'
import { subjects } from '@/db/schema/subjects'
import { eq } from 'drizzle-orm'

export async function GET() {
  try {
    const user = await requireAuth()
    const seasons = await getSeasonsForUser(user.id)
    return Response.json({ seasons })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed'
    if (message === 'Unauthorized') return Response.json({ error: message }, { status: 401 })
    return Response.json({ error: message }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireAuth()
    const body = await request.json()
    const parsed = createSeasonSchema.safeParse(body)

    if (!parsed.success) {
      return Response.json(
        { error: 'Validation failed', details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const season = await createSeason(user.id, parsed.data)

    // Get created subjects and create units+activities for each
    const createdSubjects = await db.query.subjects.findMany({
      where: eq(subjects.seasonId, season.id),
    })
    for (const subject of createdSubjects) {
      await createUnitsAndActivities(subject.id)
    }

    return Response.json({ season }, { status: 201 })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed'
    if (message === 'Unauthorized') return Response.json({ error: message }, { status: 401 })
    return Response.json({ error: message }, { status: 500 })
  }
}

