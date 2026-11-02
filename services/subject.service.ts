import { db } from '@/db'
import { subjects } from '@/db/schema/subjects'
import { units } from '@/db/schema/units'
import { unitActivities } from '@/db/schema/activities'
import { examSeasons } from '@/db/schema/exam-seasons'
import { eq, and, asc } from 'drizzle-orm'
import { cacheAside } from '@/lib/redis/cache'
import { redisKeys } from '@/lib/redis/keys'
import { CACHE_TTL } from '@/lib/redis/ttl'
import { invalidateUserCaches } from '@/lib/redis/invalidation'

export async function createSubject(
  userId: string,
  data: {
    seasonId: string
    name: string
    examDate: string
    color?: string
    position: number
  }
) {
  // Verify season ownership
  const season = await db.query.examSeasons.findFirst({
    where: and(eq(examSeasons.id, data.seasonId), eq(examSeasons.userId, userId)),
  })
  if (!season) throw new Error('Season not found')

  const [subject] = await db
    .insert(subjects)
    .values({ ...data, userId })
    .returning()

  // Auto-create 5 units + 5 activities each
  await createUnitsAndActivities(subject.id)

  await invalidateUserCaches({ userId, seasonId: data.seasonId, subjectId: subject.id })
  return subject
}

export async function createUnitsAndActivities(subjectId: string) {
  const unitNames = ['Unit 1', 'Unit 2', 'Unit 3', 'Unit 4', 'Unit 5']

  for (let i = 0; i < 5; i++) {
    const [unit] = await db
      .insert(units)
      .values({
        subjectId,
        unitNumber: i + 1,
        name: unitNames[i],
        initialStatus: 'new',
        position: i,
      })
      .returning()

    await db.insert(unitActivities).values([
      { unitId: unit.id, activityType: 'theory_1', weight: '25', estimatedSessions: 2 },
      { unitId: unit.id, activityType: 'theory_2', weight: '25', estimatedSessions: 2 },
      { unitId: unit.id, activityType: 'numericals', weight: '20', estimatedSessions: 2 },
      { unitId: unit.id, activityType: 'previous_papers', weight: '15', estimatedSessions: 1 },
      { unitId: unit.id, activityType: 'revision', weight: '15', estimatedSessions: 1 },
    ])
  }
}

export async function getSubjectById(userId: string, subjectId: string) {
  return cacheAside(redisKeys.subject(userId, subjectId), CACHE_TTL.subjects, () => db.query.subjects.findFirst({
    where: and(eq(subjects.id, subjectId), eq(subjects.userId, userId)),
    with: {
      units: {
        orderBy: [asc(units.position)],
        with: {
          unitActivities: true,
        },
      },
    },
  }))
}

export async function updateSubject(
  userId: string,
  subjectId: string,
  data: { name?: string; examDate?: string; color?: string; position?: number }
) {
  const [updated] = await db
    .update(subjects)
    .set({ ...data, updatedAt: new Date() })
    .where(and(eq(subjects.id, subjectId), eq(subjects.userId, userId)))
    .returning()
  await invalidateUserCaches({ userId, subjectId: updated?.id })
  return updated
}

export async function deleteSubject(userId: string, subjectId: string) {
  const existing = await db.query.subjects.findFirst({ where: and(eq(subjects.id, subjectId), eq(subjects.userId, userId)) })
  await db
    .delete(subjects)
    .where(and(eq(subjects.id, subjectId), eq(subjects.userId, userId)))
  await invalidateUserCaches({ userId, seasonId: existing?.seasonId, subjectId })
}

export async function getSubjectsForSeason(userId: string, seasonId: string) {
  return cacheAside(redisKeys.subjects(userId, seasonId), CACHE_TTL.subjects, () => db.query.subjects.findMany({
    where: and(eq(subjects.seasonId, seasonId), eq(subjects.userId, userId)),
    orderBy: [asc(subjects.position)],
    with: {
      units: {
        orderBy: [asc(units.position)],
        with: { unitActivities: true },
      },
    },
  }))
}

