import { db } from '@/db'
import { users } from '@/db/schema/users'
import { userPreferences } from '@/db/schema/user-preferences'
import { dailySessionTemplates } from '@/db/schema/daily-templates'
import { authSessions } from '@/db/schema/sessions'
import { hashPassword, verifyPassword } from '@/lib/auth/password'
import { eq } from 'drizzle-orm'

const DEFAULT_SLOTS = [
  { name: 'Early Morning', startTime: '06:00', endTime: '08:00', position: 0, isEnabled: true },
  { name: 'Morning', startTime: '09:00', endTime: '11:00', position: 1, isEnabled: true },
  { name: 'Pre-lunch', startTime: '12:00', endTime: '13:30', position: 2, isEnabled: true },
  { name: 'Afternoon', startTime: '14:00', endTime: '16:00', position: 3, isEnabled: true },
  { name: 'Evening', startTime: '17:00', endTime: '18:00', position: 4, isEnabled: true },
  { name: 'Night', startTime: '20:00', endTime: '22:00', position: 5, isEnabled: true },
]

export interface RegisterData {
  name: string
  email: string
  password: string
}

export async function registerUser(data: RegisterData) {
  // Check for existing user
  const existing = await db.query.users.findFirst({
    where: eq(users.email, data.email.toLowerCase()),
  })

  if (existing) {
    throw new Error('Email already registered')
  }

  const passwordHash = await hashPassword(data.password)

  // Create user
  const [user] = await db.insert(users).values({
    email: data.email.toLowerCase(),
    passwordHash,
    name: data.name,
  }).returning({
    id: users.id,
    email: users.email,
    name: users.name,
  })

  // Create default preferences
  await db.insert(userPreferences).values({
    userId: user.id,
    timezone: 'Asia/Kolkata',
    defaultSessionsPerDay: 4,
  })

  // Create default schedule slots
  await db.insert(dailySessionTemplates).values(
    DEFAULT_SLOTS.map((slot) => ({
      userId: user.id,
      ...slot,
    }))
  )

  return user
}

export async function loginUser(email: string, password: string) {
  const user = await db.query.users.findFirst({
    where: eq(users.email, email.toLowerCase()),
  })

  if (!user) {
    throw new Error('Invalid email or password')
  }

  const valid = await verifyPassword(user.passwordHash, password)
  if (!valid) {
    throw new Error('Invalid email or password')
  }

  return {
    id: user.id,
    email: user.email,
    name: user.name,
  }
}

