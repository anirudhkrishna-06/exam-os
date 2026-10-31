import Link from 'next/link'
import { ChevronRight, BookOpen } from 'lucide-react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import type { SubjectProgress as SubjectProgressType } from '@/modules/progress/types'

interface SubjectProgressProps {
  subjects: SubjectProgressType[]
}

export function SubjectProgressSection({ subjects }: SubjectProgressProps) {
  return (
    <Card className="border border-border/80 shadow-xs">
      <CardHeader className="p-4 sm:p-5 pb-3 flex flex-row items-center justify-between border-b border-border/60">
        <div>
          <CardTitle className="text-base font-semibold">Subject Syllabus Progress</CardTitle>
          <p className="text-xs text-muted-foreground mt-0.5">
            Unit completion across active subjects
          </p>
        </div>
        <Link href="/subjects">
          <Button variant="ghost" size="sm" className="text-xs gap-1 h-8">
            All Subjects <ChevronRight className="w-3.5 h-3.5" />
          </Button>
        </Link>
      </CardHeader>
      <CardContent className="p-4 sm:p-5">
        {subjects.length === 0 ? (
          <div className="text-center py-6 text-muted-foreground text-sm">
            No subjects configured yet.
          </div>
        ) : (
          <div className="space-y-4">
            {subjects.map((sub) => {
              const completedUnits = sub.units.filter((u) => u.percentComplete >= 100).length

              return (
                <div key={sub.subjectId} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 min-w-0">
                      <span
                        className="w-2.5 h-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: sub.color }}
                      />
                      <Link
                        href={`/subjects/${sub.subjectId}`}
                        className="font-semibold text-sm hover:underline truncate"
                      >
                        {sub.subjectName}
                      </Link>
                    </div>

                    <div className="flex items-center gap-3 shrink-0 text-xs">
                      <span className="text-muted-foreground hidden sm:inline">
                        {completedUnits}/5 units done
                      </span>
                      <span className="font-bold text-foreground">{sub.percentComplete}%</span>
                      <Link href={`/subjects/${sub.subjectId}`}>
                        <ChevronRight className="w-4 h-4 text-muted-foreground hover:text-foreground" />
                      </Link>
                    </div>
                  </div>

                  {/* Segmented or smooth bar */}
                  <div className="grid grid-cols-5 gap-1.5">
                    {sub.units.map((unit) => (
                      <div
                        key={unit.unitId}
                        className="bg-muted rounded-md h-2 overflow-hidden relative group"
                        title={`Unit ${unit.unitNumber}: ${unit.unitName} (${unit.percentComplete}%)`}
                      >
                        <div
                          className="h-full rounded-md transition-all duration-300"
                          style={{
                            width: `${unit.percentComplete}%`,
                            backgroundColor: sub.color,
                          }}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

