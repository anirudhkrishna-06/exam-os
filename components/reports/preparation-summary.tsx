import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { CheckCircle2, AlertTriangle, Layers, BookOpen } from 'lucide-react'
import type { SubjectReadiness } from '@/services/readiness.service'

interface PreparationSummaryProps {
  readinessList: SubjectReadiness[]
}

export function PreparationSummary({ readinessList }: PreparationSummaryProps) {
  const totalSubjects = readinessList.length
  const totalUnits = readinessList.reduce((acc, s) => acc + s.units.length, 0)
  const completedUnits = readinessList.reduce((acc, s) => acc + s.unitsCompleted, 0)
  const inProgressUnits = readinessList.reduce((acc, s) => acc + s.unitsInProgress, 0)
  const untouchedUnits = readinessList.reduce((acc, s) => acc + s.unitsNotStarted, 0)
  const overloadedSubjects = readinessList.filter((s) => s.isOverloaded).length

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
      <Card className="border border-border/80 shadow-xs">
        <CardContent className="p-4">
          <p className="text-xs text-muted-foreground font-medium">Total Units</p>
          <p className="text-2xl font-bold text-foreground mt-0.5">{totalUnits}</p>
          <p className="text-[11px] text-muted-foreground mt-0.5">Across {totalSubjects} subjects</p>
        </CardContent>
      </Card>

      <Card className="border border-border/80 shadow-xs">
        <CardContent className="p-4">
          <p className="text-xs text-muted-foreground font-medium">Completed Units</p>
          <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">
            {completedUnits}
          </p>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            {totalUnits > 0 ? Math.round((completedUnits / totalUnits) * 100) : 0}% of total syllabus
          </p>
        </CardContent>
      </Card>

      <Card className="border border-border/80 shadow-xs">
        <CardContent className="p-4">
          <p className="text-xs text-muted-foreground font-medium">In Progress</p>
          <p className="text-2xl font-bold text-blue-600 dark:text-blue-400 mt-0.5">
            {inProgressUnits}
          </p>
          <p className="text-[11px] text-muted-foreground mt-0.5">{untouchedUnits} untouched</p>
        </CardContent>
      </Card>

      <Card className="border border-border/80 shadow-xs">
        <CardContent className="p-4">
          <p className="text-xs text-muted-foreground font-medium">Overload Alerts</p>
          <p
            className={`text-2xl font-bold mt-0.5 ${
              overloadedSubjects > 0
                ? 'text-rose-600 dark:text-rose-400'
                : 'text-foreground'
            }`}
          >
            {overloadedSubjects}
          </p>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            {overloadedSubjects > 0 ? 'Urgent schedule tuning needed' : 'All subjects within capacity'}
          </p>
        </CardContent>
      </Card>
    </div>
  )
}

