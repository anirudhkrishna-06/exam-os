import { requireAuth } from '@/lib/auth/session'
import { getPlanSummary } from '@/services/planner.service'
import { getSubjectsForSeason } from '@/services/subject.service'
import { getScheduleSlots } from '@/services/preferences.service'
import { notFound } from 'next/navigation'
import { PlanGenerator } from '@/components/planner/plan-generator'
import { todayDateString } from '@/lib/date/utils'

export const instant = false

export default async function GeneratePlanPage({
  params,
}: {
  params: Promise<{ seasonId: string }>
}) {
  const user = await requireAuth()
  const { seasonId } = await params
  const summary = await getPlanSummary(user.id, seasonId)
  const [subjects, slots] = await Promise.all([
    getSubjectsForSeason(user.id, seasonId),
    getScheduleSlots(user.id),
  ])

  if (!summary) {
    notFound()
  }

  return (
    <div className="px-4 py-6 sm:px-6">
      <PlanGenerator
        seasonId={seasonId}
        subjects={subjects}
        slots={slots}
        defaultDate={todayDateString()}
      />
    </div>
  )
}

