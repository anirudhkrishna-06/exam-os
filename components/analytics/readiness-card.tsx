import { AlertTriangle, CheckCircle, Clock, BookOpen } from 'lucide-react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import type { SubjectReadiness } from '@/services/readiness.service'

interface ReadinessCardProps {
  readinessList: SubjectReadiness[]
}

export function ReadinessCard({ readinessList }: ReadinessCardProps) {
  return (
    <Card className="border border-border/80 shadow-xs">
      <CardHeader className="p-4 sm:p-5 pb-2 border-b border-border/60">
        <CardTitle className="text-base font-semibold">Examination Readiness Summary</CardTitle>
        <p className="text-xs text-muted-foreground mt-0.5">
          Factual readiness without arbitrary confidence scoring
        </p>
      </CardHeader>
      <CardContent className="p-4 sm:p-5">
        {readinessList.length === 0 ? (
          <div className="text-center py-8 text-sm text-muted-foreground">
            No subjects configured for readiness tracking.
          </div>
        ) : (
          <div className="space-y-4">
            {readinessList.map((sub) => (
              <div
                key={sub.subjectId}
                className="p-3.5 rounded-lg border border-border/70 bg-card space-y-3"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span
                      className="w-3 h-3 rounded-full shrink-0"
                      style={{ backgroundColor: sub.color }}
                    />
                    <h4 className="font-semibold text-sm text-foreground">{sub.subjectName}</h4>
                    <span className="text-xs text-muted-foreground">
                      ({sub.daysRemaining} days remaining)
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    {sub.isOverloaded ? (
                      <Badge variant="destructive" className="text-[11px] gap-1">
                        <AlertTriangle className="w-3 h-3" /> Overload Warning
                      </Badge>
                    ) : sub.percentComplete >= 80 ? (
                      <Badge className="bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800 text-[11px] gap-1">
                        <CheckCircle className="w-3 h-3" /> Exam Ready
                      </Badge>
                    ) : (
                      <Badge variant="secondary" className="text-[11px] gap-1">
                        <Clock className="w-3 h-3" /> In Progress
                      </Badge>
                    )}
                    <span className="font-bold text-sm text-foreground">
                      {sub.percentComplete}%
                    </span>
                  </div>
                </div>

                {/* Overload alert if detected */}
                {sub.isOverloaded && (
                  <div className="p-2.5 rounded-md bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 text-xs text-rose-800 dark:text-rose-300">
                    <span className="font-semibold">Capacity Warning:</span> {sub.remainingSessions}{' '}
                    sessions remaining, but only ~{sub.availableCapacityBeforeExam} session slots
                    available before examination date. Recommended: increase daily capacity or mark
                    known topics complete.
                  </div>
                )}

                {/* Units stats breakdown */}
                <div className="grid grid-cols-3 gap-2 text-xs text-center pt-1 border-t border-border/50">
                  <div className="p-2 rounded bg-muted/30">
                    <p className="text-[10px] text-muted-foreground">Units Finished</p>
                    <p className="font-bold text-emerald-600 dark:text-emerald-400">
                      {sub.unitsCompleted}/5
                    </p>
                  </div>
                  <div className="p-2 rounded bg-muted/30">
                    <p className="text-[10px] text-muted-foreground">Units In Progress</p>
                    <p className="font-bold text-blue-600 dark:text-blue-400">
                      {sub.unitsInProgress}/5
                    </p>
                  </div>
                  <div className="p-2 rounded bg-muted/30">
                    <p className="text-[10px] text-muted-foreground">Units Untouched</p>
                    <p className="font-bold text-amber-600 dark:text-amber-400">
                      {sub.unitsNotStarted}/5
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

