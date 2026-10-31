import { getCurrentUser } from '@/lib/auth/session'
import { getSeasonsForUser } from '@/services/season.service'
import { getSeasonProgress } from '@/services/progress.service'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { BookOpen, Calendar, ChevronRight, Layers, Plus } from 'lucide-react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { formatDate, daysUntil } from '@/lib/date/utils'

export const instant = false

export const metadata = {
  title: 'Subjects | ExamOS',
}

export default async function SubjectsPage() {
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
        <h1 className="text-2xl font-bold">Subjects</h1>
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <BookOpen className="h-12 w-12 text-muted-foreground/60 mb-3" />
            <h3 className="font-semibold text-lg">No Exam Seasons</h3>
            <p className="text-muted-foreground text-sm max-w-sm mt-1 mb-5">
              Create a season to add subjects and syllabus content.
            </p>
            <Button asChild>
              <Link href="/seasons/new">Create Season</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  const seasonProgress = await getSeasonProgress(user.id, activeSeason.id)
  const subjectsList = seasonProgress?.subjects ?? []

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-6xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
            Subjects & Syllabus
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Active season:{' '}
            <span className="font-semibold text-foreground">{activeSeason.name}</span>
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button asChild variant="outline">
            <Link href={`/seasons/${activeSeason.id}`}>Manage Season</Link>
          </Button>
        </div>
      </div>

      {subjectsList.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <BookOpen className="h-10 w-10 text-muted-foreground mb-3" />
            <p className="text-muted-foreground text-sm">No subjects found in this season.</p>
            <Button asChild className="mt-4" size="sm">
              <Link href={`/seasons/${activeSeason.id}`}>Add Subjects</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {subjectsList.map((sub) => {
            const days = daysUntil(sub.examDate)
            const completedUnits = sub.units.filter((u) => u.percentComplete >= 100).length

            return (
              <Card
                key={sub.subjectId}
                className="border border-border/80 shadow-xs hover:border-primary/50 transition-colors"
              >
                <CardHeader className="p-4 sm:p-5 pb-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span
                        className="w-3.5 h-3.5 rounded-full shrink-0"
                        style={{ backgroundColor: sub.color }}
                      />
                      <CardTitle className="text-base font-semibold truncate">
                        {sub.subjectName}
                      </CardTitle>
                    </div>
                    <Badge
                      variant={days <= 7 ? 'destructive' : days <= 30 ? 'warning' : 'secondary'}
                      className="text-xs shrink-0"
                    >
                      {days === 0 ? 'Today!' : `${days}d left`}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground flex items-center gap-1.5 mt-1">
                    <Calendar className="w-3.5 h-3.5" />
                    Exam date: {formatDate(sub.examDate)}
                  </p>
                </CardHeader>
                <CardContent className="p-4 sm:p-5 pt-0 space-y-4">
                  {/* Progress info */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-xs font-medium">
                      <span className="text-muted-foreground">Syllabus Progress</span>
                      <span className="text-foreground font-bold">{sub.percentComplete}%</span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-300"
                        style={{
                          width: `${sub.percentComplete}%`,
                          backgroundColor: sub.color,
                        }}
                      />
                    </div>
                  </div>

                  {/* Units mini tags */}
                  <div className="flex items-center justify-between text-xs text-muted-foreground pt-1 border-t border-border/50">
                    <span className="flex items-center gap-1">
                      <Layers className="w-3.5 h-3.5" />
                      {completedUnits} of 5 units completed
                    </span>
                    <span className="font-medium text-foreground">
                      {sub.totalCompletedSessions}/{sub.totalEstimatedSessions} sessions
                    </span>
                  </div>

                  <Button asChild variant="outline" size="sm" className="w-full">
                    <Link href={`/subjects/${sub.subjectId}`}>
                      Configure Syllabus & Units
                      <ChevronRight className="w-3.5 h-3.5 ml-1" />
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}

