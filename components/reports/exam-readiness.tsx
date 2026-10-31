import Link from 'next/link'
import { AlertTriangle, CheckCircle, Clock, ArrowRight, ShieldCheck, HelpCircle } from 'lucide-react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import type { SubjectReadiness } from '@/services/readiness.service'

interface ExamReadinessReportProps {
  readinessList: SubjectReadiness[]
}

export function ExamReadinessReport({ readinessList }: ExamReadinessReportProps) {
  return (
    <div className="space-y-6">
      {readinessList.map((subject) => (
        <Card key={subject.subjectId} className="border border-border/80 shadow-xs overflow-hidden">
          {/* Subject Header */}
          <div className="p-4 sm:p-5 border-b border-border/60 bg-muted/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <span
                className="w-3.5 h-3.5 rounded-full shrink-0"
                style={{ backgroundColor: subject.color }}
              />
              <div>
                <h3 className="font-bold text-base text-foreground">{subject.subjectName}</h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Exam Date: {new Date(subject.examDate).toLocaleDateString(undefined, {
                    month: 'long',
                    day: 'numeric',
                    year: 'numeric',
                  })}{' '}
                  • <span className="font-semibold text-foreground">{subject.daysRemaining} days remaining</span>
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {subject.isOverloaded ? (
                <Badge variant="destructive" className="gap-1 py-1 px-2.5">
                  <AlertTriangle className="w-3.5 h-3.5" /> High Overload Risk
                </Badge>
              ) : subject.percentComplete >= 80 ? (
                <Badge className="bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800 gap-1 py-1 px-2.5">
                  <ShieldCheck className="w-3.5 h-3.5" /> Exam Ready
                </Badge>
              ) : (
                <Badge variant="secondary" className="gap-1 py-1 px-2.5">
                  <Clock className="w-3.5 h-3.5" /> Pacing On Schedule
                </Badge>
              )}
              <Link href={`/subjects/${subject.subjectId}`}>
                <Button variant="outline" size="sm" className="h-8 text-xs gap-1">
                  Edit Syllabus <ArrowRight className="w-3.5 h-3.5" />
                </Button>
              </Link>
            </div>
          </div>

          <CardContent className="p-4 sm:p-5 space-y-4">
            {/* Overload Warning Box */}
            {subject.isOverloaded && (
              <div className="p-3.5 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 text-xs text-rose-900 dark:text-rose-200 flex items-start gap-2.5">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600 dark:text-rose-400" />
                <div>
                  <p className="font-bold">Overload Detected for {subject.subjectName}</p>
                  <p className="mt-0.5 text-rose-800 dark:text-rose-300">
                    You have {subject.remainingSessions} remaining sessions to complete, but only ~
                    {subject.availableCapacityBeforeExam} session slots are available in your schedule
                    before the exam date ({subject.shortfallSessions} session shortfall).
                  </p>
                  <p className="mt-1 font-medium text-rose-900 dark:text-rose-200">
                    Action: Increase daily session templates in Settings, adjust unit session counts,
                    or mark already-known topics as completed in the syllabus.
                  </p>
                </div>
              </div>
            )}

            {/* Units Breakdown Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border/60 text-muted-foreground text-left">
                    <th className="pb-2 font-medium">Unit</th>
                    <th className="pb-2 font-medium">Title</th>
                    <th className="pb-2 font-medium text-center">Status</th>
                    <th className="pb-2 font-medium text-right">Completion</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40">
                  {subject.units.map((unit) => (
                    <tr key={unit.unitId} className="hover:bg-muted/30">
                      <td className="py-2.5 font-semibold text-foreground">Unit {unit.unitNumber}</td>
                      <td className="py-2.5 text-foreground/90">{unit.unitName}</td>
                      <td className="py-2.5 text-center">
                        {unit.status === 'completed' ? (
                          <Badge className="bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800 text-[10px]">
                            Completed
                          </Badge>
                        ) : unit.status === 'in_progress' ? (
                          <Badge variant="secondary" className="text-[10px]">
                            In Progress
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-[10px] text-muted-foreground">
                            Not Started
                          </Badge>
                        )}
                      </td>
                      <td className="py-2.5 text-right font-mono font-semibold text-foreground">
                        {unit.percentComplete}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Summary Metrics Bar */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-border/50 text-center text-xs">
              <div className="p-2 rounded bg-muted/20">
                <span className="text-muted-foreground block text-[10px]">Total Required</span>
                <span className="font-bold text-foreground">{subject.totalRequiredSessions} sessions</span>
              </div>
              <div className="p-2 rounded bg-muted/20">
                <span className="text-muted-foreground block text-[10px]">Completed</span>
                <span className="font-bold text-emerald-600 dark:text-emerald-400">
                  {subject.completedSessions} sessions
                </span>
              </div>
              <div className="p-2 rounded bg-muted/20">
                <span className="text-muted-foreground block text-[10px]">Remaining</span>
                <span className="font-bold text-amber-600 dark:text-amber-400">
                  {subject.remainingSessions} sessions
                </span>
              </div>
              <div className="p-2 rounded bg-muted/20">
                <span className="text-muted-foreground block text-[10px]">Overall Progress</span>
                <span className="font-bold text-foreground">{subject.percentComplete}%</span>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

