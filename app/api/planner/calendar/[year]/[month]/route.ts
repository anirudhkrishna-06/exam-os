import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth/session'
import { getSessionsForMonth } from '@/services/session.service'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ year: string; month: string }> }
) {
  try {
    const user = await requireAuth()
    const { year, month } = await params
    const yearNum = parseInt(year, 10)
    const monthNum = parseInt(month, 10)

    if (isNaN(yearNum) || isNaN(monthNum) || monthNum < 1 || monthNum > 12) {
      return NextResponse.json({ error: 'Valid year and month (1-12) are required' }, { status: 400 })
    }

    const sessionsByDate = await getSessionsForMonth(user.id, yearNum, monthNum)
    return NextResponse.json(sessionsByDate)
  } catch (err: any) {
    if (err.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    return NextResponse.json({ error: err.message || 'Failed to fetch calendar sessions' }, { status: 500 })
  }
}

