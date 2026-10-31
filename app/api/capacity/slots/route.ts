import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth/session'
import { getDailySlotOverrides, setSlotOverrides } from '@/services/capacity.service'

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth()
    const { searchParams } = new URL(request.url)
    const seasonId = searchParams.get('seasonId')
    const date = searchParams.get('date')

    if (!seasonId || !date) {
      return NextResponse.json({ error: 'seasonId and date query parameters are required' }, { status: 400 })
    }

    const overrides = await getDailySlotOverrides(user.id, seasonId, date)
    return NextResponse.json(overrides)
  } catch (err: any) {
    if (err.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    return NextResponse.json({ error: err.message || 'Failed to get slot overrides' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const user = await requireAuth()
    const body = await request.json()
    const { seasonId, date, overrides } = body

    if (!seasonId || !date || !Array.isArray(overrides)) {
      return NextResponse.json({ error: 'seasonId, date, and overrides array are required' }, { status: 400 })
    }

    const updated = await setSlotOverrides(user.id, seasonId, date, overrides)
    return NextResponse.json(updated)
  } catch (err: any) {
    if (err.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    return NextResponse.json({ error: err.message || 'Failed to update slot overrides' }, { status: 400 })
  }
}

