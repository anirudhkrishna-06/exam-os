import { getCurrentUser } from '@/lib/auth/session'

export async function GET() {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 })
    }
    return Response.json({ user })
  } catch {
    return Response.json({ error: 'Failed to get user' }, { status: 500 })
  }
}

