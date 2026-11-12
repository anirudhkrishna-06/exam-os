import { registerSchema } from '@/lib/validation/auth'
import { registerUser } from '@/services/auth.service'
import { createSession, setSessionCookie } from '@/lib/auth/session'
import { checkRateLimit } from '@/lib/auth/rate-limit'
import { isRegistrationEnabled } from '@/services/app-settings.service'

export async function POST(request: Request) {
  try {
    if (!(await isRegistrationEnabled())) {
      return Response.json({ error: 'New enrollment is currently closed.' }, { status: 403 })
    }
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || '127.0.0.1'
    const limit = checkRateLimit(`register:${ip}`, 10, 15 * 60 * 1000)
    if (!limit.allowed) {
      return Response.json(
        { error: 'Too many registration attempts. Please try again later.' },
        { status: 429 },
      )
    }

    const body = await request.json()
    const parsed = registerSchema.safeParse(body)

    if (!parsed.success) {
      return Response.json(
        { error: 'Validation failed', details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const user = await registerUser(parsed.data)
    const token = await createSession(user.id)
    await setSessionCookie(token)

    return Response.json({ user: { id: user.id, email: user.email, name: user.name } }, { status: 201 })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Registration failed'
    const status = message === 'Email already registered' ? 409 : 500
    return Response.json({ error: message }, { status })
  }
}

