import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth/session'
import { moveSession } from '@/services/session.service'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const user = await requireAuth()
    const { sessionId } = await params
    const body = await request.json()
    const { newDate, newSlotName, newStartTime, newEndTime, newPosition } = body

    if (!newDate || !newSlotName || !newStartTime || !newEndTime) {
      return NextResponse.json({ error: 'Missing required fields to move session' }, { status: 400 })
    }

    const updated = await moveSession(
      user.id,
      sessionId,
      newDate,
      newSlotName,
      newStartTime,
      newEndTime,
      newPosition ?? 0
    )

    return NextResponse.json(updated)
  } catch (err: any) {
    if (err.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    return NextResponse.json({ error: err.message || 'Failed to move session' }, { status: 400 })
  }
}

