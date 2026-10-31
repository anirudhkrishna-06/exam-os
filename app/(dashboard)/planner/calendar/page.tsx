import { requireAuth } from '@/lib/auth/session'
import { getSessionsForMonth } from '@/services/session.service'
import { getSeasonsForUser } from '@/services/season.service'
import { getSubjectsForSeason } from '@/services/subject.service'
import { getCapacityOverridesForSeason } from '@/services/capacity.service'
import { CalendarView } from '@/components/planner/calendar-view'

export const instant = false

export default async function PlannerCalendarPage({
  searchParams,
}: {
  searchParams: Promise<{ year?: string; month?: string }>
}) {
  const user = await requireAuth()
  const { year: qYear, month: qMonth } = await searchParams

  const now = new Date()
  const year = qYear ? parseInt(qYear, 10) : now.getFullYear()
  const month = qMonth ? parseInt(qMonth, 10) : now.getMonth() + 1

  const seasons = await getSeasonsForUser(user.id)
  const activeSeason = seasons.find((s) => s.status === 'active') || seasons[0]

  const [rawSessionsByDate, seasonSubjects, capacityOverrides] = await Promise.all([
    getSessionsForMonth(user.id, year, month),
    activeSeason ? getSubjectsForSeason(user.id, activeSeason.id) : Promise.resolve([]),
    activeSeason ? getCapacityOverridesForSeason(user.id, activeSeason.id) : Promise.resolve([]),
  ])

  // Extract exam dates
  const examDates = seasonSubjects.map((s) => ({
    subjectName: s.name,
    examDate: s.examDate,
    color: s.color || '#3b82f6',
  }))

  // Extract rest dates in this month
  const restDates = capacityOverrides
    .filter((c) => c.isRestDay)
    .map((c) => c.date)

  // Map rawSessionsByDate into calendar format
  const sessionsByDate: Record<string, any[]> = {}
  for (const [date, sessions] of Object.entries(rawSessionsByDate)) {
    sessionsByDate[date] = sessions.map((s) => ({
      id: s.id,
      scheduledDate: s.scheduledDate,
      slotName: s.slotName,
      status: s.status,
      activity: s.activity
        ? {
            unit: {
              subject: {
                id: s.activity.unit.subject.id,
                name: s.activity.unit.subject.name,
                color: s.activity.unit.subject.color,
                examDate: s.activity.unit.subject.examDate,
              },
            },
          }
        : undefined,
    }))
  }

  return (
    <div className="py-6 space-y-6">
      <CalendarView
        initialYear={year}
        initialMonth={month}
        sessionsByDate={sessionsByDate}
        examDates={examDates}
        restDates={restDates}
      />
    </div>
  )
}

