import { db } from '@/db'
import { units } from '@/db/schema/units'
import { unitActivities } from '@/db/schema/activities'
import { subjects } from '@/db/schema/subjects'
import { eq, and } from 'drizzle-orm'
import { invalidateUserCaches } from '@/lib/redis/invalidation'

async function verifyUnitOwnership(userId: string, unitId: string) {
  const unit = await db.query.units.findFirst({
    where: eq(units.id, unitId),
    with: {
      subject: {
        columns: { userId: true },
      },
    },
  })
  if (!unit || unit.subject.userId !== userId) {
    throw new Error('Unit not found')
  }
  return unit
}

export async function updateUnit(
  userId: string,
  unitId: string,
  data: { name?: string; initialStatus?: 'new' | 'partially_studied' | 'previously_studied'; difficulty?: 'easy' | 'medium' | 'hard' }
) {
  await verifyUnitOwnership(userId, unitId)

  const [updated] = await db
    .update(units)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(units.id, unitId))
    .returning()
  await invalidateUserCaches({ userId })
  return updated
}

export async function updateActivity(
  userId: string,
  activityId: string,
  data: {
    enabled?: boolean
    weight?: number
    estimatedSessions?: number
    status?: 'not_started' | 'in_progress' | 'completed'
  }
) {
  // Verify ownership through unit -> subject -> user chain
  const activity = await db.query.unitActivities.findFirst({
    where: eq(unitActivities.id, activityId),
    with: {
      unit: {
        with: {
          subject: { columns: { userId: true } },
        },
      },
    },
  })
  if (!activity || activity.unit.subject.userId !== userId) {
    throw new Error('Activity not found')
  }

  const updateData: Record<string, unknown> = { updatedAt: new Date() }
  if (data.enabled !== undefined) updateData.enabled = data.enabled
  if (data.weight !== undefined) updateData.weight = data.weight.toString()
  if (data.estimatedSessions !== undefined) updateData.estimatedSessions = data.estimatedSessions
  if (data.status !== undefined) updateData.status = data.status

  const [updated] = await db
    .update(unitActivities)
    .set(updateData)
    .where(eq(unitActivities.id, activityId))
    .returning()
  await invalidateUserCaches({ userId })
  return updated
}

export async function bulkUpdateUnitsForSubject(
  userId: string,
  subjectId: string,
  initialStatus: 'new' | 'partially_studied' | 'previously_studied'
) {
  // Verify subject ownership
  const subject = await db.query.subjects.findFirst({
    where: and(eq(subjects.id, subjectId), eq(subjects.userId, userId)),
    with: { units: { columns: { id: true } } },
  })
  if (!subject) throw new Error('Subject not found')

  const unitIds = subject.units.map((u) => u.id)

  await Promise.all(
    unitIds.map((unitId) =>
      db
        .update(units)
        .set({ initialStatus, updatedAt: new Date() })
        .where(eq(units.id, unitId))
    )
  )
  await invalidateUserCaches({ userId, subjectId })
}

export async function bulkUpdateActivitiesForSubject(
  userId: string,
  subjectId: string,
  activityType: 'theory_1' | 'theory_2' | 'numericals' | 'previous_papers' | 'revision',
  enabled: boolean
) {
  const subject = await db.query.subjects.findFirst({
    where: and(eq(subjects.id, subjectId), eq(subjects.userId, userId)),
    with: {
      units: {
        with: { unitActivities: { columns: { id: true, activityType: true } } },
      },
    },
  })
  if (!subject) throw new Error('Subject not found')

  const activityIds = subject.units.flatMap((u) =>
    u.unitActivities
      .filter((a) => a.activityType === activityType)
      .map((a) => a.id)
  )

  await Promise.all(
    activityIds.map((id) =>
      db
        .update(unitActivities)
        .set({ enabled, updatedAt: new Date() })
        .where(eq(unitActivities.id, id))
    )
  )
  await invalidateUserCaches({ userId, subjectId })
}
