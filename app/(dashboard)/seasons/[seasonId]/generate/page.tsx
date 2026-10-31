import { requireAuth } from '@/lib/auth/session'
import { getPlanSummary } from '@/services/planner.service'
import { notFound } from 'next/navigation'
import { PlanGenerator } from '@/components/planner/plan-generator'

export const instant = false

export default async function GeneratePlanPage({
  params,
}: {
  params: Promise<{ seasonId: string }>
}) {
  const user = await requireAuth()
  const { seasonId } = await params
  const summary = await getPlanSummary(user.id, seasonId)

  if (!summary) {
    notFound()
  }

  return (
    <div className="py-6">
      <PlanGenerator seasonId={seasonId} summary={summary} />
    </div>
  )
}

