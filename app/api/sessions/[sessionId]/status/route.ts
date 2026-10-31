import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth/session'
import { updateSessionStatus } from '@/services/session.service'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const user = await requireAuth()
    const { sessionId } = await params
    const body = await request.json()
    const { status, note, actualDurationMinutes } = body

    if (!status || !['scheduled', 'in_progress', 'completed', 'skipped', 'overdue'].includes(status)) {
      return NextResponse.json({ error: 'Valid status is required' }, { status: 400 })
    }

    const updated = await updateSessionStatus(
      user.id,
      sessionId,
      status,
      note,
      actualDurationMinutes
    )

    return NextResponse.json(updated)
  } catch (err: any) {
    if (err.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    return NextResponse.json({ error: err.message || 'Failed to update session status' }, { status: 400 })
  }
}

