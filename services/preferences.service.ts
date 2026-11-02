import { db } from '@/db'
import { userPreferences } from '@/db/schema/user-preferences'
import { dailySessionTemplates } from '@/db/schema/daily-templates'
import { eq, asc } from 'drizzle-orm'
import { cacheAside } from '@/lib/redis/cache'
import { redisKeys } from '@/lib/redis/keys'
import { CACHE_TTL } from '@/lib/redis/ttl'
import { invalidateUserCaches } from '@/lib/redis/invalidation'

export async function getPreferences(userId: string) {
  return cacheAside(redisKeys.preferences(userId), CACHE_TTL.preferences, () => db.query.userPreferences.findFirst({
    where: eq(userPreferences.userId, userId),
  }))
}

export async function updatePreferences(
  userId: string,
  data: { timezone?: string; defaultSessionsPerDay?: number }
) {
  const [updated] = await db
    .update(userPreferences)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(userPreferences.userId, userId))
    .returning()
  await invalidateUserCaches({ userId })
  return updated
}

export async function getScheduleSlots(userId: string) {
  return cacheAside(redisKeys.scheduleSlots(userId), CACHE_TTL.preferences, async () => {
  const slots = await db.query.dailySessionTemplates.findMany({
    where: eq(dailySessionTemplates.userId, userId),
    orderBy: [asc(dailySessionTemplates.position)],
  })

  // PostgreSQL returns `time` columns with seconds (for example, `06:00:00`),
  // while the browser time input and settings API use `HH:MM`.
  return slots.map((slot) => ({
    ...slot,
    startTime: slot.startTime.slice(0, 5),
    endTime: slot.endTime.slice(0, 5),
  }))
  })
}

export interface SlotData {
  id?: string
  name: string
  startTime: string
  endTime: string
  position: number
  isEnabled: boolean
}

export async function saveScheduleSlots(
  userId: string,
  slots: SlotData[],
  defaultSessionsPerDay: number
) {
  // Delete all existing slots and re-insert
  await db.delete(dailySessionTemplates).where(eq(dailySessionTemplates.userId, userId))

  if (slots.length > 0) {
    await db.insert(dailySessionTemplates).values(
      slots.map((slot, i) => ({
        userId,
        name: slot.name,
        startTime: slot.startTime,
        endTime: slot.endTime,
        position: i,
        isEnabled: slot.isEnabled,
      }))
    )
  }

  // Update preferences
  await db
    .update(userPreferences)
    .set({ defaultSessionsPerDay, updatedAt: new Date() })
    .where(eq(userPreferences.userId, userId))

  await invalidateUserCaches({ userId })
  return getScheduleSlots(userId)
}

