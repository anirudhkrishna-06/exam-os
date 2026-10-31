import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth/session'
import { reschedulePlanForSeason } from '@/services/planner.service'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ seasonId: string }> }
) {
  try {
    const user = await requireAuth()
    const { seasonId } = await params
    const result = await reschedulePlanForSeason(user.id, seasonId)
    return NextResponse.json(result)
  } catch (err: any) {
    if (err.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    return NextResponse.json({ error: err.message || 'Failed to reschedule plan' }, { status: 500 })
  }
}

