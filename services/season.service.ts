import { db } from '@/db'
import { examSeasons } from '@/db/schema/exam-seasons'
import { subjects } from '@/db/schema/subjects'
import { eq, and, desc } from 'drizzle-orm'
import { cacheAside } from '@/lib/redis/cache'
import { redisKeys } from '@/lib/redis/keys'
import { CACHE_TTL } from '@/lib/redis/ttl'
import { invalidateUserCaches } from '@/lib/redis/invalidation'

export interface CreateSeasonData {
  name: string
  startDate: string
  subjects: Array<{
    name: string
    examDate: string
    color?: string
  }>
}

export async function createSeason(userId: string, data: CreateSeasonData) {
  // Derive end date from latest exam date
  const endDate = data.subjects
    .map((s) => s.examDate)
    .sort()
    .at(-1)!

  const [season] = await db
    .insert(examSeasons)
    .values({
      userId,
      name: data.name,
      startDate: data.startDate,
      endDate,
      status: 'draft',
    })
    .returning()

  // Create subjects
  for (let i = 0; i < data.subjects.length; i++) {
    const sub = data.subjects[i]
    await db.insert(subjects).values({
      seasonId: season.id,
      userId,
      name: sub.name,
      examDate: sub.examDate,
      color: sub.color,
      position: i,
    })
  }

  await invalidateUserCaches({ userId })
  return season
}

export async function getSeasonsForUser(userId: string) {
  return cacheAside(redisKeys.seasons(userId), CACHE_TTL.seasons, async () => {
  const seasons = await db.query.examSeasons.findMany({
    where: eq(examSeasons.userId, userId),
    orderBy: [desc(examSeasons.createdAt)],
    with: {
      subjects: {
        orderBy: (s, { asc }) => [asc(s.position)],
      },
    },
  })
  return seasons
  })
}

export async function getSeasonById(userId: string, seasonId: string) {
  return cacheAside(redisKeys.season(userId, seasonId), CACHE_TTL.seasons, () => db.query.examSeasons.findFirst({
    where: and(eq(examSeasons.id, seasonId), eq(examSeasons.userId, userId)),
    with: {
      subjects: {
        orderBy: (s, { asc }) => [asc(s.position)],
        with: {
          units: {
            orderBy: (u, { asc }) => [asc(u.position)],
            with: {
              unitActivities: true,
            },
          },
        },
      },
    },
  }))
}

export async function updateSeason(
  userId: string,
  seasonId: string,
  data: { name?: string; startDate?: string; status?: 'draft' | 'active' | 'completed' | 'archived' }
) {
  const [updated] = await db
    .update(examSeasons)
    .set({ ...data, updatedAt: new Date() })
    .where(and(eq(examSeasons.id, seasonId), eq(examSeasons.userId, userId)))
    .returning()
  await invalidateUserCaches({ userId, seasonId })
  return updated
}

export async function deleteSeason(userId: string, seasonId: string) {
  await db
    .delete(examSeasons)
    .where(and(eq(examSeasons.id, seasonId), eq(examSeasons.userId, userId)))
  await invalidateUserCaches({ userId, seasonId })
}

