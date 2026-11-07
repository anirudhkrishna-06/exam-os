import { getCurrentUser } from '@/lib/auth/session'
import { getSeasonsForUser } from '@/services/season.service'
import { getSeasonProgress } from '@/services/progress.service'
import { getSessionsForDate } from '@/services/session.service'
import { getExamReadiness } from '@/services/readiness.service'
import { getWorkloadSummary } from '@/services/analytics.service'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { BookOpen, Plus } from 'lucide-react'
import { WelcomeHeader } from '@/components/dashboard/welcome-header'
import { TodaySessions, TodaySessionItem } from '@/components/dashboard/today-sessions'
import { SubjectProgressSection } from '@/components/dashboard/subject-progress'
import { WorkloadOverview } from '@/components/dashboard/workload-overview'
import { CurrentTaskOverview, OverviewTask } from '@/components/dashboard/current-task-overview'
import { todayDateString } from '@/lib/date/utils'

export const instant = false

export const metadata = {
  title: 'Overview | paramaa... padi da',
}

const ACTIVITY_LABELS: Record<string, string> = {
  theory_1: 'Theory 1',
  theory_2: 'Theory 2',
  numericals: 'Numericals',
  previous_papers: 'Past Papers',
  revision: 'Revision',
}

export default async function OverviewPage() {
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
        <div className="flex items-center justify-between pb-4 border-b">
          <div>
            <h1 className="text-2xl font-bold">Welcome, {user.name}</h1>
            <p className="text-muted-foreground text-sm">
              Get started by creating your first exam season.
            </p>
          </div>
        </div>

        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <BookOpen className="h-12 w-12 text-muted-foreground/60 mb-3" />
            <h3 className="font-semibold text-lg">No Exam Season Found</h3>
            <p className="text-muted-foreground text-sm max-w-sm mt-1 mb-5">
              Create an exam season with subjects and exam dates to start planning your studies.
            </p>
            <Button asChild>
              <Link href="/seasons/new">
                <Plus className="h-4 w-4 mr-2" />
                Create Exam Season
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  const today = new Date()
  const todayIso = todayDateString()
  const todayFormatted = today.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })

  // Fetch season progress, readiness, today's sessions, workload stats in parallel
  const [seasonProgress, readinessList, todayRawSessions, workload] = await Promise.all([
    getSeasonProgress(user.id, activeSeason.id),
    getExamReadiness(user.id, activeSeason.id),
    getSessionsForDate(user.id, todayIso),
    getWorkloadSummary(user.id, activeSeason.id),
  ])

  // Map today's sessions to view items
  const todaySessions: TodaySessionItem[] = todayRawSessions.map((s) => ({
    id: s.id,
    slotName: s.slotName,
    startTime: s.startTime,
    endTime: s.endTime,
    status: s.status,
    subjectName: s.activity?.unit?.subject?.name ?? 'Unknown',
    subjectColor: s.activity?.unit?.subject?.color ?? '#6366f1',
    unitNumber: s.activity?.unit?.unitNumber ?? 1,
    unitName: s.activity?.unit?.name ?? 'Unit',
    activityType: s.activity?.activityType ?? 'theory_1',
    activityLabel:
      ACTIVITY_LABELS[s.activity?.activityType ?? 'theory_1'] ?? s.activity?.activityType,
    confidenceRating: s.confidenceRating,
  }))

  const overviewTasks: OverviewTask[] = todaySessions.map((session) => ({ ...session, href: `/sessions/${session.id}` }))
  const nextReadiness = readinessList[0]
  const nextExam = nextReadiness ? { subjectId: nextReadiness.subjectId, subjectName: nextReadiness.subjectName, color: nextReadiness.color, examDate: nextReadiness.examDate, daysRemaining: nextReadiness.daysRemaining, percentComplete: nextReadiness.percentComplete } : null

  return (
    <div className="mx-auto w-full max-w-7xl space-y-8 p-4 sm:p-6 lg:p-8">
      {/* Welcome Header */}
      <WelcomeHeader
        userName={user.name ?? 'Student'}
        seasonName={activeSeason.name}
        todayFormatted={todayFormatted}
        todayIso={todayIso}
      />

      <CurrentTaskOverview tasks={overviewTasks} nextExam={nextExam} />

      <TodaySessions sessions={todaySessions} todayIso={todayIso} />

      {/* Subject Syllabus Preparation */}
      <SubjectProgressSection subjects={seasonProgress?.subjects ?? []} />

      {/* Workload & Pacing Summary */}
      <WorkloadOverview stats={workload} />
    </div>
  )
}
