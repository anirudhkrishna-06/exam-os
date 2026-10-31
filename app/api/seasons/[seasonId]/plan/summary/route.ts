import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth/session'
import { getPlanSummary } from '@/services/planner.service'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ seasonId: string }> }
) {
  try {
    const user = await requireAuth()
    const { seasonId } = await params
    const summary = await getPlanSummary(user.id, seasonId)
    if (!summary) {
      return NextResponse.json({ error: 'Season not found' }, { status: 404 })
    }
    return NextResponse.json(summary)
  } catch (err: any) {
    if (err.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    return NextResponse.json({ error: err.message || 'Failed to get plan summary' }, { status: 500 })
  }
}

