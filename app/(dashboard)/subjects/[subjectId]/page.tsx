import { getCurrentUser } from '@/lib/auth/session'
import { getSubjectById } from '@/services/subject.service'
import { getSubjectProgress } from '@/services/progress.service'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { ChevronRight, Calendar, CheckCircle2, Clock } from 'lucide-react'
import { SubjectSyllabusView } from '@/components/syllabus/subject-syllabus-view'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { daysUntil, formatDate } from '@/lib/date/utils'
import { getSubjectKnowledge } from '@/services/knowledge.service'
import { SubjectKnowledgeHub } from '@/components/knowledge/subject-knowledge-hub'

export const instant = false

export const metadata = {
  title: 'Subject Syllabus & Progress | ExamOS',
}

export default async function SubjectPage({
  params,
}: {
  params: Promise<{ subjectId: string }>
}) {
  const user = await getCurrentUser()
  if (!user) redirect('/login')

  const { subjectId } = await params
  const [subject, progress, knowledge] = await Promise.all([
    getSubjectById(user.id, subjectId),
    getSubjectProgress(user.id, subjectId),
    getSubjectKnowledge(user.id, subjectId),
  ])

  if (!subject) notFound()

  const daysLeft = daysUntil(subject.examDate)

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-6xl mx-auto space-y-6">
      {/* Breadcrumb navigation */}
      <nav className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Link href="/overview" className="hover:text-foreground">
          Dashboard
        </Link>
        <ChevronRight className="h-3.5 w-3.5" />
        <Link href="/subjects" className="hover:text-foreground">
          Subjects
        </Link>
        <ChevronRight className="h-3.5 w-3.5" />
        <Link href={`/seasons/${subject.seasonId}`} className="hover:text-foreground">
          Season
        </Link>
        <ChevronRight className="h-3.5 w-3.5" />
        <span className="text-foreground font-medium">{subject.name}</span>
      </nav>

      {/* Progress & Exam Header Card */}
      <Card className="border border-border/80 shadow-xs">
        <CardContent className="p-5 sm:p-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span
                  className="w-3.5 h-3.5 rounded-full shrink-0"
                  style={{ backgroundColor: subject.color ?? '#6366f1' }}
                />
                <h1 className="text-2xl font-bold tracking-tight text-foreground">
                  {subject.name}
                </h1>
                <Badge variant={daysLeft <= 7 ? 'destructive' : 'secondary'} className="text-xs">
                  {daysLeft === 0 ? 'Exam Today!' : `${daysLeft} days remaining`}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground flex items-center gap-1.5 pt-0.5">
                <Calendar className="w-3.5 h-3.5" />
                Examination Date: <span className="font-medium text-foreground">{formatDate(subject.examDate)}</span>
              </p>
            </div>

            {/* Quick Stat Pill */}
            <div className="flex items-center gap-4 bg-muted/40 p-3 rounded-lg border border-border/60">
              <div className="text-center px-2">
                <p className="text-[11px] text-muted-foreground font-medium">Completion</p>
                <p className="text-xl font-bold text-foreground">
                  {progress?.percentComplete ?? 0}%
                </p>
              </div>
              <div className="w-px h-8 bg-border" />
              <div className="text-center px-2">
                <p className="text-[11px] text-muted-foreground font-medium">Sessions</p>
                <p className="text-xl font-bold text-foreground">
                  {progress?.totalCompletedSessions ?? 0}
                  <span className="text-xs font-normal text-muted-foreground">
                    /{progress?.totalEstimatedSessions ?? 0}
                  </span>
                </p>
              </div>
            </div>
          </div>

          {/* Unit Progress Mini-Bars */}
          {progress && progress.units.length > 0 && (
            <div className="mt-5 pt-4 border-t border-border/60">
              <p className="text-xs font-medium text-muted-foreground mb-2">Unit Progress Breakdown</p>
              <div className="grid grid-cols-1 sm:grid-cols-5 gap-2.5">
                {progress.units.map((unit) => (
                  <div
                    key={unit.unitId}
                    className="p-2.5 rounded-lg border border-border/60 bg-card text-xs space-y-1.5"
                  >
                    <div className="flex justify-between items-center text-[11px]">
                      <span className="font-semibold text-foreground truncate">Unit {unit.unitNumber}</span>
                      <span className="text-muted-foreground">{unit.percentComplete}%</span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-1.5 overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{
                          width: `${unit.percentComplete}%`,
                          backgroundColor: subject.color ?? '#6366f1',
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Main Syllabus Configuration */}
      <SubjectSyllabusView initialSubject={subject as any} />
      {knowledge && <SubjectKnowledgeHub subjectId={subject.id} units={knowledge.units as any} />}
    </div>
  )
}
