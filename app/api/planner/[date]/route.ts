import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth/session'
import { getSessionsForDate } from '@/services/session.service'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ date: string }> }
) {
  try {
    const user = await requireAuth()
    const { date } = await params
    const sessions = await getSessionsForDate(user.id, date)
    return NextResponse.json(sessions)
  } catch (err: any) {
    if (err.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    return NextResponse.json({ error: err.message || 'Failed to fetch sessions for date' }, { status: 500 })
  }
}

