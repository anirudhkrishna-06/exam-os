import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth/session'
import { generatePlanForSeason, getActivePlan } from '@/services/planner.service'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ seasonId: string }> }
) {
  try {
    const user = await requireAuth()
    const { seasonId } = await params
    const result = await generatePlanForSeason(user.id, seasonId)
    return NextResponse.json(result)
  } catch (err: any) {
    if (err.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    return NextResponse.json({ error: err.message || 'Failed to generate plan' }, { status: 500 })
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ seasonId: string }> }
) {
  try {
    const user = await requireAuth()
    const { seasonId } = await params
    const activePlan = await getActivePlan(user.id, seasonId)
    return NextResponse.json(activePlan)
  } catch (err: any) {
    if (err.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    return NextResponse.json({ error: err.message || 'Failed to retrieve plan' }, { status: 500 })
  }
}

