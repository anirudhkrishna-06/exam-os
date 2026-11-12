import { eq } from 'drizzle-orm'
import { db } from '@/db'
import { appSettings } from '@/db/schema/app-settings'

export async function isRegistrationEnabled() {
  const [settings] = await db.select({ enabled: appSettings.registrationEnabled }).from(appSettings).where(eq(appSettings.id, 1)).limit(1)
  // Missing settings means a fresh database. Preserve the current behavior
  // until the migration has been applied and the row is explicitly changed.
  return settings?.enabled ?? true
}

export async function setRegistrationEnabled(enabled: boolean) {
  await db.insert(appSettings).values({ id: 1, registrationEnabled: enabled, updatedAt: new Date() }).onConflictDoUpdate({ target: appSettings.id, set: { registrationEnabled: enabled, updatedAt: new Date() } })
}
