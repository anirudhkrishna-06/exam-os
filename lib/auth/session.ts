import { cookies } from 'next/headers'
import { connection } from 'next/server'
import { db } from '@/db'
import { authSessions } from '@/db/schema/sessions'
import { users } from '@/db/schema/users'
import { eq, and, gt } from 'drizzle-orm'
import { createHash, randomBytes } from 'crypto'

const SESSION_COOKIE = 'exam_os_session'
const SESSION_DURATION_DAYS = 30

function generateToken(): string {
  return randomBytes(32).toString('hex')
}

function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex')
}

export async function createSession(userId: string): Promise<string> {
  const token = generateToken()
  const tokenHash = hashToken(token)
  const expiresAt = new Date(Date.now() + SESSION_DURATION_DAYS * 24 * 60 * 60 * 1000)

  await db.insert(authSessions).values({
    userId,
    tokenHash,
    expiresAt,
  })

  return token
}

export async function setSessionCookie(token: string): Promise<void> {
  const cookieStore = await cookies()
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: SESSION_DURATION_DAYS * 24 * 60 * 60,
    path: '/',
  })
}

export async function getSessionFromCookie(): Promise<{ userId: string; sessionId: string } | null> {
  // Session state and its expiration check are request-specific. With Cache
  // Components enabled, keep this work out of the prerendered shell.
  await connection()

  const cookieStore = await cookies()
  const token = cookieStore.get(SESSION_COOKIE)?.value

  if (!token) return null

  const tokenHash = hashToken(token)
  const now = new Date()

  const session = await db.query.authSessions.findFirst({
    where: and(
      eq(authSessions.tokenHash, tokenHash),
      gt(authSessions.expiresAt, now)
    ),
  })

  if (!session) return null

  return { userId: session.userId, sessionId: session.id }
}

export async function getCurrentUser() {
  const session = await getSessionFromCookie()
  if (!session) return null

  const user = await db.query.users.findFirst({
    where: eq(users.id, session.userId),
    columns: {
      id: true,
      email: true,
      name: true,
      createdAt: true,
    },
  })

  return user ?? null
}

export async function deleteSession(): Promise<void> {
  const cookieStore = await cookies()
  const token = cookieStore.get(SESSION_COOKIE)?.value

  if (token) {
    const tokenHash = hashToken(token)
    await db.delete(authSessions).where(eq(authSessions.tokenHash, tokenHash))
  }

  cookieStore.set(SESSION_COOKIE, '', { maxAge: 0, path: '/' })
}

export async function requireAuth() {
  const user = await getCurrentUser()
  if (!user) {
    throw new Error('Unauthorized')
  }
  return user
}

