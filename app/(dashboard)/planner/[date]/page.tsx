import { requireAuth } from '@/lib/auth/session'
import { getSessionsForDate } from '@/services/session.service'
import { getDailyCapacity } from '@/services/capacity.service'
import { getScheduleSlots, getPreferences } from '@/services/preferences.service'
import { getSeasonsForUser } from '@/services/season.service'
import { getSubjectsForSeason } from '@/services/subject.service'
import { DailyView } from '@/components/planner/daily-view'
import type { SessionCardData } from '@/components/planner/session-card'
import { getRevisionSuggestions } from '@/services/revision.service'

export const instant = false

export default async function DailyPlannerPage({
  params,
}: {
  params: Promise<{ date: string }>
}) {
  const user = await requireAuth()
  const { date } = await params

  // User preferences & slots
  const [prefs, templates, seasons] = await Promise.all([
    getPreferences(user.id),
    getScheduleSlots(user.id),
    getSeasonsForUser(user.id),
  ])

  // Active or most recent season
  const activeSeason = seasons.find((s) => s.status === 'active') || seasons[0]
  const seasonSubjects = activeSeason
    ? await getSubjectsForSeason(user.id, activeSeason.id)
    : []
  const revisionSuggestions = activeSeason
    ? await getRevisionSuggestions(user.id, activeSeason.id, date)
    : []

  // Sessions for this date
  const rawSessions = await getSessionsForDate(user.id, date)

  // Capacity override
  const capacityOverride = activeSeason
    ? await getDailyCapacity(user.id, activeSeason.id, date)
    : null

  // Transform sessions to SessionCardData format
  const sessions: SessionCardData[] = rawSessions.map((s) => ({
    id: s.id,
    slotName: s.slotName,
    startTime: s.startTime,
    endTime: s.endTime,
    position: s.position,
    status: s.status,
    estimatedDurationMinutes: s.estimatedDurationMinutes,
    actualDurationMinutes: s.actualDurationMinutes,
    completionNote: s.completionNote,
    confidenceRating: s.confidenceRating,
    activity: s.activity
      ? {
          id: s.activity.id,
          activityType: s.activity.activityType,
          unit: {
            id: s.activity.unit.id,
            unitNumber: s.activity.unit.unitNumber,
            name: s.activity.unit.name,
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

  return (
    <div className="w-full max-w-7xl mx-auto px-4 py-5 sm:px-6 lg:px-8 lg:py-8">
      <DailyView
        date={date}
        seasonId={activeSeason?.id}
        sessions={sessions}
        templates={templates.map((t) => ({
          id: t.id,
          name: t.name,
          startTime: t.startTime,
          endTime: t.endTime,
          position: t.position,
        }))}
        capacityOverride={
          capacityOverride
            ? {
                sessionCount: capacityOverride.sessionCount,
                isRestDay: capacityOverride.isRestDay,
              }
            : null
        }
        defaultSessionsPerDay={prefs?.defaultSessionsPerDay ?? 4}
        upcomingExams={seasonSubjects.map((subject) => ({
          name: subject.name,
          examDate: subject.examDate,
          color: subject.color || '#3b82f6',
        }))}
        subjects={seasonSubjects.map((subject) => ({
          id: subject.id,
          name: subject.name,
          examDate: subject.examDate,
          color: subject.color,
          units: subject.units.map((unit) => ({
            id: unit.id,
            unitNumber: unit.unitNumber,
            name: unit.name,
            difficulty: unit.difficulty,
            unitActivities: unit.unitActivities.map((activity) => ({ id: activity.id, activityType: activity.activityType, enabled: activity.enabled, status: activity.status })),
          })),
        }))}
        revisionSuggestions={revisionSuggestions}
      />
    </div>
  )
}
