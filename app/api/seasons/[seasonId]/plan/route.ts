import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth/session'
import { createManualSession, getActivePlan } from '@/services/planner.service'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ seasonId: string }> }
) {
  try {
    const user = await requireAuth()
    const { seasonId } = await params
    const body = await request.json()
    if (body.seasonId && body.seasonId !== seasonId) return NextResponse.json({ error: 'Invalid season' }, { status: 400 })
    if (!body.activityId || !body.scheduledDate || !body.slotName || !body.startTime || !body.endTime) {
      return NextResponse.json({ error: 'Activity, date, and time slot are required' }, { status: 400 })
    }
    if (!Number.isFinite(Number(body.estimatedDurationMinutes)) || Number(body.estimatedDurationMinutes) < 15) {
      return NextResponse.json({ error: 'Planned duration must be at least 15 minutes' }, { status: 400 })
    }
    const result = await createManualSession(user.id, {
      seasonId,
      activityId: body.activityId,
      scheduledDate: body.scheduledDate,
      slotName: body.slotName,
      startTime: body.startTime,
      endTime: body.endTime,
      estimatedDurationMinutes: Number(body.estimatedDurationMinutes),
    })
    return NextResponse.json({ session: result }, { status: 201 })
  } catch (err: any) {
    if (err.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
      return NextResponse.json({ error: err.message || 'Failed to add session' }, { status: 500 })
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

