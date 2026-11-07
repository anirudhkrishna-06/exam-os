import { getCurrentUser } from '@/lib/auth/session'
import { getSeasonById } from '@/services/season.service'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { CalendarDays, ChevronRight, BookOpen, CalendarPlus, Clock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { formatDate, daysUntil } from '@/lib/date/utils'

export const instant = false

export const metadata = {
  title: 'Season | paramaa... padi da',
}

export default async function SeasonPage({
  params,
}: {
  params: Promise<{ seasonId: string }>
}) {
  const user = await getCurrentUser()
  if (!user) redirect('/login')

  const { seasonId } = await params
  const season = await getSeasonById(user.id, seasonId)
  if (!season) notFound()

  const statusLabel: Record<string, string> = {
    draft: 'Draft',
    active: 'Active',
    completed: 'Completed',
    archived: 'Archived',
  }

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-1.5 text-sm text-muted-foreground">
        <Link href="/seasons" className="hover:text-foreground">Seasons</Link>
        <ChevronRight className="h-4 w-4" />
        <span className="text-foreground font-medium">{season.name}</span>
      </nav>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-2xl font-bold tracking-tight">{season.name}</h1>
            <Badge variant={season.status === 'active' ? 'success' : 'secondary'}>
              {statusLabel[season.status]}
            </Badge>
          </div>
          <p className="text-muted-foreground text-sm flex items-center gap-1.5">
            <CalendarDays className="h-4 w-4" />
            {formatDate(season.startDate)} → {formatDate(season.endDate)}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link href={`/seasons/${season.id}/generate`}>
            <Button size="sm" className="gap-2">
              <CalendarPlus className="w-4 h-4" />
              Plan a Session
            </Button>
          </Link>
          <Link href="/planner">
            <Button size="sm" variant="outline" className="gap-2">
              <Clock className="w-4 h-4" />
              View Planner
            </Button>
          </Link>
        </div>
      </div>

      {/* Subjects grid */}
      <section>
        <h2 className="text-lg font-semibold mb-3">
          Subjects ({season.subjects.length})
        </h2>

        {season.subjects.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center py-12 text-center">
              <BookOpen className="h-8 w-8 text-muted-foreground mb-3" />
              <p className="text-muted-foreground text-sm">No subjects in this season yet</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {season.subjects.map((subject) => {
              const days = daysUntil(subject.examDate)
              const completedActivities = subject.units.flatMap((u) =>
                u.unitActivities.filter((a) => a.status === 'completed' && a.enabled)
              ).length
              const totalActivities = subject.units.flatMap((u) =>
                u.unitActivities.filter((a) => a.enabled)
              ).length
              const progress = totalActivities > 0
                ? Math.round((completedActivities / totalActivities) * 100)
                : 0

              return (
                <Link key={subject.id} href={`/subjects/${subject.id}`}>
                  <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
                    {subject.color && (
                      <div
                        className="h-1 w-full rounded-t-xl"
                        style={{ backgroundColor: subject.color }}
                      />
                    )}
                    <CardContent className="pt-4 pb-4 space-y-3">
                      <div>
                        <p className="font-semibold">{subject.name}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {formatDate(subject.examDate)}
                          {days >= 0 && (
                            <span
                              className={
                                days <= 7
                                  ? ' text-destructive font-medium'
                                  : days <= 30
                                  ? ' text-orange-500'
                                  : ''
                              }
                            >
                              {' '}· {days === 0 ? 'Today' : `${days}d left`}
                            </span>
                          )}
                        </p>
                      </div>

                      {/* Progress bar */}
                      <div className="space-y-1">
                        <div className="flex justify-between text-xs text-muted-foreground">
                          <span>Progress</span>
                          <span>{progress}%</span>
                        </div>
                        <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                          <div
                            className="h-full rounded-full bg-primary transition-all"
                            style={{ width: `${progress}%` }}
                          />
                        </div>
                      </div>

                      <p className="text-xs text-muted-foreground">
                        {subject.units.length} unit{subject.units.length !== 1 ? 's' : ''}
                      </p>
                    </CardContent>
                  </Card>
                </Link>
              )
            })}
          </div>
        )}
      </section>
    </div>
  )
}
