import { deleteSession } from '@/lib/auth/session'

export async function POST() {
  try {
    await deleteSession()
    return Response.json({ success: true })
  } catch {
    return Response.json({ error: 'Logout failed' }, { status: 500 })
  }
}

