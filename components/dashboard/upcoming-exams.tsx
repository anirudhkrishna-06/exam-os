import Link from 'next/link'
import { Calendar, AlertTriangle, CheckCircle, Clock } from 'lucide-react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

export interface UpcomingExamItem {
  subjectId: string
  subjectName: string
  color: string
  examDate: string
  daysRemaining: number
  percentComplete: number
  isOverloaded?: boolean
}

interface UpcomingExamsProps {
  exams: UpcomingExamItem[]
}

export function UpcomingExams({ exams }: UpcomingExamsProps) {
  const getReadinessBadge = (exam: UpcomingExamItem) => {
    if (exam.percentComplete >= 80) {
      return (
        <Badge className="bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800 text-[10px]">
          <CheckCircle className="w-3 h-3 mr-1" /> Ready
        </Badge>
      )
    }
    if (exam.isOverloaded) {
      return (
        <Badge variant="destructive" className="text-[10px]">
          <AlertTriangle className="w-3 h-3 mr-1" /> Tight Schedule
        </Badge>
      )
    }
    if (exam.percentComplete >= 40) {
      return (
        <Badge className="bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-400 border-blue-200 dark:border-blue-800 text-[10px]">
          <Clock className="w-3 h-3 mr-1" /> On Track
        </Badge>
      )
    }
    return (
      <Badge className="bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-400 border-amber-200 dark:border-amber-800 text-[10px]">
        Needs Work
      </Badge>
    )
  }

  return (
    <Card className="overflow-hidden border-border/70 bg-gradient-to-br from-card via-card to-primary/[0.03] shadow-sm">
      <CardHeader className="border-b border-border/60 p-5 pb-4 sm:p-6 sm:pb-5">
        <div>
          <CardTitle className="text-lg font-semibold tracking-tight">Upcoming Examinations</CardTitle>
          <p className="mt-1 text-sm text-muted-foreground">Your next deadlines, readiness, and remaining runway</p>
        </div>
      </CardHeader>
      <CardContent className="p-5 sm:p-6">
        {exams.length === 0 ? (
          <div className="text-center py-6 text-muted-foreground text-sm">
            No exams configured for this season.
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {exams.map((exam) => (
              <Link
                key={exam.subjectId}
                href={`/subjects/${exam.subjectId}`}
                className="group block rounded-xl border border-border/80 bg-background/70 p-4 transition-all hover:-translate-y-0.5 hover:border-primary/50 hover:shadow-sm"
              >
                <div className="flex min-h-12 items-start justify-between gap-3">
                  <div className="flex min-w-0 flex-1 items-start gap-2.5">
                    <span
                      className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full ring-4 ring-background"
                      style={{ backgroundColor: exam.color }}
                    />
                    <h4 className="line-clamp-2 break-words text-sm font-semibold leading-tight transition-colors group-hover:text-primary">
                      {exam.subjectName}
                    </h4>
                  </div>
                  <div className="shrink-0">{getReadinessBadge(exam)}</div>
                </div>

                <div className="mt-4 grid grid-cols-[minmax(0,1fr)_auto] items-end gap-3">
                  <span className="flex min-w-0 items-center gap-1.5 text-xs text-muted-foreground">
                    <Calendar className="h-3.5 w-3.5 shrink-0" />
                    <span className="truncate">
                      {new Date(exam.examDate).toLocaleDateString(undefined, {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </span>
                  </span>
                  <span className="whitespace-nowrap text-right text-sm font-bold tracking-tight text-foreground">
                    {exam.daysRemaining === 0 ? 'Today' : `${exam.daysRemaining}d left`}
                  </span>
                </div>

                <div className="mt-4 space-y-1.5">
                  <div className="flex justify-between text-xs font-medium">
                    <span className="text-muted-foreground">Preparation</span>
                    <span className="text-foreground">{exam.percentComplete}%</span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${exam.percentComplete}%`,
                        backgroundColor: exam.color,
                      }}
                    />
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

