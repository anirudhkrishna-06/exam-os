import { getCurrentUser } from '@/lib/auth/session'
import { getSeasonsForUser } from '@/services/season.service'
import { getSeasonProgress } from '@/services/progress.service'
import {
  getWeeklyCompletionData,
  getSessionStatusBreakdown,
} from '@/services/analytics.service'
import { getExamReadiness } from '@/services/readiness.service'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { BarChart3, BookOpen, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { SubjectProgressChart } from '@/components/analytics/subject-progress-chart'
import { WeeklyCompletionChart } from '@/components/analytics/weekly-completion-chart'
import { SessionDistribution } from '@/components/analytics/session-distribution'
import { ReadinessCard } from '@/components/analytics/readiness-card'

export const instant = false

export const metadata = {
  title: 'Analytics & Insights | paramaa... padi da',
}

export default async function AnalyticsPage() {
  const user = await getCurrentUser()
  if (!user) redirect('/login')

  const seasons = await getSeasonsForUser(user.id)
  const activeSeason =
    seasons.find((s) => s.status === 'active') ??
    seasons.find((s) => s.status === 'draft') ??
    seasons[0]

  if (!activeSeason) {
    return (
      <div className="p-6 max-w-5xl mx-auto space-y-6">
        <h1 className="text-2xl font-bold">Analytics</h1>
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <BookOpen className="h-12 w-12 text-muted-foreground/60 mb-3" />
            <h3 className="font-semibold text-lg">No Exam Seasons</h3>
            <p className="text-muted-foreground text-sm max-w-sm mt-1 mb-5">
              Create an exam season to start tracking study analytics and readiness.
            </p>
            <Button asChild>
              <Link href="/seasons/new">Create Season</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Fetch all analytics data concurrently
  const [seasonProgress, weeklyData, statusDistribution, readinessList] = await Promise.all([
    getSeasonProgress(user.id, activeSeason.id),
    getWeeklyCompletionData(user.id, activeSeason.id),
    getSessionStatusBreakdown(user.id, activeSeason.id),
    getExamReadiness(user.id, activeSeason.id),
  ])

  const subjectChartData = (seasonProgress?.subjects ?? []).map((s) => ({
    name: s.subjectName,
    percent: s.percentComplete,
    color: s.color,
  }))

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
            Analytics & Progress
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Active Season:{' '}
            <span className="font-semibold text-foreground">{activeSeason.name}</span>
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button asChild variant="outline">
            <Link href="/reports">View Exam Readiness Report</Link>
          </Button>
        </div>
      </div>

      {/* Top Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <SubjectProgressChart data={subjectChartData} />
        <WeeklyCompletionChart data={weeklyData} />
      </div>

      {/* Bottom Grid: Status Distribution & Readiness */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        <SessionDistribution data={statusDistribution} />
        <ReadinessCard readinessList={readinessList} />
      </div>
    </div>
  )
}

