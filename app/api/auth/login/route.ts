import { loginSchema } from '@/lib/validation/auth'
import { loginUser } from '@/services/auth.service'
import { createSession, setSessionCookie } from '@/lib/auth/session'
import { checkRateLimit } from '@/lib/auth/rate-limit'

export async function POST(request: Request) {
  try {
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || '127.0.0.1'
    const limit = checkRateLimit(`login:${ip}`, 10, 15 * 60 * 1000)
    if (!limit.allowed) {
      return Response.json(
        { error: 'Too many login attempts. Please try again later.' },
        { status: 429 },
      )
    }

    const body = await request.json()
    const parsed = loginSchema.safeParse(body)

    if (!parsed.success) {
      return Response.json(
        { error: 'Validation failed', details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const user = await loginUser(parsed.data.email, parsed.data.password)
    const token = await createSession(user.id)
    await setSessionCookie(token)

    return Response.json({ user: { id: user.id, email: user.email, name: user.name } })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Login failed'
    const status = message === 'Invalid email or password' ? 401 : 500
    return Response.json({ error: message }, { status })
  }
}

