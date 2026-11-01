import { db } from '@/db'
import { studySessions } from '@/db/schema/study-sessions'
import { and, eq } from 'drizzle-orm'
import { getDailyCapacity } from '@/services/capacity.service'
import { getPreferences, getScheduleSlots } from '@/services/preferences.service'
import { revisionDismissals } from '@/db/schema/revision-dismissals'

const INTERVALS = [2, 7, 14]
const DAY = 86_400_000

function addDays(date: string, days: number) {
  const [year, month, day] = date.split('-').map(Number)
  const result = new Date(year, month - 1, day + days)
  return `${result.getFullYear()}-${String(result.getMonth() + 1).padStart(2, '0')}-${String(result.getDate()).padStart(2, '0')}`
}

function daysBetween(from: string, to: string) {
  const [fy, fm, fd] = from.split('-').map(Number)
  const [ty, tm, td] = to.split('-').map(Number)
  return Math.round((new Date(ty, tm - 1, td).getTime() - new Date(fy, fm - 1, fd).getTime()) / DAY)
}

export async function getRevisionSuggestions(userId: string, seasonId: string, today: string) {
  const [sessions, slots, preferences, dismissals] = await Promise.all([
    db.query.studySessions.findMany({
      where: and(eq(studySessions.userId, userId), eq(studySessions.seasonId, seasonId)),
      with: { activity: { with: { unit: { with: { subject: true, unitActivities: true } } } } },
    }),
    getScheduleSlots(userId),
    getPreferences(userId),
    db.query.revisionDismissals.findMany({ where: eq(revisionDismissals.userId, userId) }),
  ])
  const completedTheory = sessions.filter((session) => session.status === 'completed' && (session.activity.activityType === 'theory_1' || session.activity.activityType === 'theory_2'))
  const suggestions: Array<{ id: string; subjectId: string; subjectName: string; unitId: string; unitName: string; activityId: string; sourceActivity: string; suggestedDate: string; reason: string }> = []

  for (const source of completedTheory) {
    const revision = source.activity.unit.unitActivities.find((activity) => activity.activityType === 'revision' && activity.enabled && activity.status !== 'completed')
    if (!revision) continue
    const laterRevision = sessions.some((session) => session.activity.id === revision.id && session.scheduledDate >= today && session.status !== 'skipped')
    if (laterRevision) continue
    const completedDate = source.completedAt ? source.completedAt.toISOString().slice(0, 10) : source.scheduledDate
    const previousRevisions = sessions.filter((session) => session.activity.id === revision.id && session.status === 'completed' && session.scheduledDate >= completedDate)
    const interval = INTERVALS[Math.min(previousRevisions.length, INTERVALS.length - 1)]
    let suggestedDate = addDays(completedDate, interval)
    if (suggestedDate < today) suggestedDate = today
    if (suggestedDate >= source.activity.unit.subject.examDate) suggestedDate = addDays(source.activity.unit.subject.examDate, -1)
    if (suggestedDate < today) continue

    const capacity = await getDailyCapacity(userId, seasonId, suggestedDate)
    const scheduled = sessions.filter((session) => session.scheduledDate === suggestedDate && session.status !== 'skipped').length
    const capacityLimit = capacity?.isRestDay ? 0 : capacity?.sessionCount ?? preferences?.defaultSessionsPerDay ?? slots.length
    if (scheduled >= Math.min(capacityLimit, slots.length || capacityLimit)) {
      const daysToExam = daysBetween(suggestedDate, source.activity.unit.subject.examDate)
      if (daysToExam <= 0) continue
      suggestedDate = addDays(suggestedDate, 1)
    }
    const key = `${revision.id}:${suggestedDate}`
    if (dismissals.some((item) => item.activityId === revision.id && item.suggestedDate === suggestedDate)) continue
    if (suggestions.some((item) => item.id === key)) continue
    suggestions.push({
      id: key,
      subjectId: source.activity.unit.subject.id,
      subjectName: source.activity.unit.subject.name,
      unitId: source.activity.unit.id,
      unitName: source.activity.unit.name,
      activityId: revision.id,
      sourceActivity: source.activity.activityType,
      suggestedDate,
      reason: `Review after ${source.activity.activityType === 'theory_1' ? 'Theory 1' : 'Theory 2'}`,
    })
  }
  return suggestions.sort((a, b) => a.suggestedDate.localeCompare(b.suggestedDate)).slice(0, 8)
}

export async function dismissRevisionSuggestion(userId: string, activityId: string, suggestedDate: string) {
  await db.insert(revisionDismissals).values({ userId, activityId, suggestedDate }).onConflictDoNothing()
}
