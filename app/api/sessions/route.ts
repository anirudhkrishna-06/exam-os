import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth/session'
import { getSessionsForDate } from '@/services/session.service'

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth()
    const { searchParams } = new URL(request.url)
    const date = searchParams.get('date')

    if (!date) {
      return NextResponse.json({ error: 'Date query parameter is required (YYYY-MM-DD)' }, { status: 400 })
    }

    const sessions = await getSessionsForDate(user.id, date)
    return NextResponse.json(sessions)
  } catch (err: any) {
    if (err.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    return NextResponse.json({ error: err.message || 'Failed to get sessions' }, { status: 500 })
  }
}

