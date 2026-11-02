// ============================================================
// services/capacity.service.ts
// Manage daily capacity overrides and slot overrides per day.
// ============================================================

import { db } from '@/db'
import { dailyCapacity } from '@/db/schema/daily-capacity'
import { dailySlotOverrides } from '@/db/schema/daily-slot-overrides'
import { dailySessionTemplates } from '@/db/schema/daily-templates'
import { userPreferences } from '@/db/schema/user-preferences'
import { eq, and } from 'drizzle-orm'
import { invalidateUserCaches } from '@/lib/redis/invalidation'

// ---- Daily capacity ----

export async function getDailyCapacity(
  userId: string,
  seasonId: string,
  date: string,
) {
  const override = await db.query.dailyCapacity.findFirst({
    where: and(
      eq(dailyCapacity.userId, userId),
      eq(dailyCapacity.seasonId, seasonId),
      eq(dailyCapacity.date, date),
    ),
  })
  return override ?? null
}

export async function setDailyCapacity(
  userId: string,
  seasonId: string,
  date: string,
  sessionCount: number,
  isRestDay: boolean,
) {
  const existing = await getDailyCapacity(userId, seasonId, date)
  if (existing) {
    const [updated] = await db
      .update(dailyCapacity)
      .set({ sessionCount, isRestDay, updatedAt: new Date() })
      .where(eq(dailyCapacity.id, existing.id))
      .returning()
    await invalidateUserCaches({ userId, seasonId })
    return updated
  }
  const [created] = await db
    .insert(dailyCapacity)
    .values({ userId, seasonId, date, sessionCount, isRestDay })
    .returning()
  await invalidateUserCaches({ userId, seasonId })
  return created
}

export async function getCapacityOverridesForSeason(
  userId: string,
  seasonId: string,
) {
  return db.query.dailyCapacity.findMany({
    where: and(
      eq(dailyCapacity.userId, userId),
      eq(dailyCapacity.seasonId, seasonId),
    ),
  })
}

// ---- Slot overrides ----

export async function getDailySlotOverrides(
  userId: string,
  seasonId: string,
  date: string,
) {
  return db.query.dailySlotOverrides.findMany({
    where: and(
      eq(dailySlotOverrides.userId, userId),
      eq(dailySlotOverrides.seasonId, seasonId),
      eq(dailySlotOverrides.date, date),
    ),
    orderBy: (t, { asc }) => [asc(t.position)],
  })
}

export async function setSlotOverrides(
  userId: string,
  seasonId: string,
  date: string,
  overrides: Array<{
    templateId: string | null
    slotName: string
    startTime: string
    endTime: string
    isAvailable: boolean
    position: number
  }>,
) {
  // Replace all overrides for this date
  await db
    .delete(dailySlotOverrides)
    .where(
      and(
        eq(dailySlotOverrides.userId, userId),
        eq(dailySlotOverrides.seasonId, seasonId),
        eq(dailySlotOverrides.date, date),
      )
    )

  if (overrides.length === 0) {
    await invalidateUserCaches({ userId, seasonId })
    return []
  }

  const inserted = await db
    .insert(dailySlotOverrides)
    .values(overrides.map(o => ({ ...o, userId, seasonId, date })))
    .returning()

  await invalidateUserCaches({ userId, seasonId })
  return inserted
}

export async function getSlotOverridesForSeason(
  userId: string,
  seasonId: string,
) {
  return db.query.dailySlotOverrides.findMany({
    where: and(
      eq(dailySlotOverrides.userId, userId),
      eq(dailySlotOverrides.seasonId, seasonId),
    ),
    orderBy: (t, { asc }) => [asc(t.date), asc(t.position)],
  })
}

