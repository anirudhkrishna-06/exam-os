import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth/session'
import { getDailyCapacity, setDailyCapacity } from '@/services/capacity.service'

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth()
    const { searchParams } = new URL(request.url)
    const seasonId = searchParams.get('seasonId')
    const date = searchParams.get('date')

    if (!seasonId || !date) {
      return NextResponse.json({ error: 'seasonId and date query parameters are required' }, { status: 400 })
    }

    const capacity = await getDailyCapacity(user.id, seasonId, date)
    return NextResponse.json(capacity)
  } catch (err: any) {
    if (err.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    return NextResponse.json({ error: err.message || 'Failed to get daily capacity' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const user = await requireAuth()
    const body = await request.json()
    const { seasonId, date, sessionCount, isRestDay } = body

    if (!seasonId || !date || sessionCount === undefined) {
      return NextResponse.json({ error: 'seasonId, date, and sessionCount are required' }, { status: 400 })
    }

    const updated = await setDailyCapacity(
      user.id,
      seasonId,
      date,
      Number(sessionCount),
      Boolean(isRestDay)
    )

    return NextResponse.json(updated)
  } catch (err: any) {
    if (err.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    return NextResponse.json({ error: err.message || 'Failed to set daily capacity' }, { status: 400 })
  }
}

