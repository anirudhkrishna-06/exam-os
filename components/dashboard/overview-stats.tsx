import { CheckCircle2, Clock, CalendarDays, TrendingUp } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'

interface OverviewStatsProps {
  overallPercent: number
  sessionsCompleted: number
  sessionsPending: number
  daysUntilNextExam: number | null
}

export function OverviewStats({
  overallPercent,
  sessionsCompleted,
  sessionsPending,
  daysUntilNextExam,
}: OverviewStatsProps) {
  const stats = [
    {
      title: 'Overall Syllabus',
      value: `${overallPercent}%`,
      description: 'Weighted syllabus completion',
      icon: TrendingUp,
      color: 'text-primary',
      bg: 'bg-primary/10',
    },
    {
      title: 'Completed Sessions',
      value: sessionsCompleted,
      description: 'Study sessions finished',
      icon: CheckCircle2,
      color: 'text-emerald-600 dark:text-emerald-400',
      bg: 'bg-emerald-50 dark:bg-emerald-950/40',
    },
    {
      title: 'Pending Sessions',
      value: sessionsPending,
      description: 'Remaining scheduled work',
      icon: Clock,
      color: 'text-amber-600 dark:text-amber-400',
      bg: 'bg-amber-50 dark:bg-amber-950/40',
    },
    {
      title: 'Next Examination',
      value: daysUntilNextExam !== null ? `${daysUntilNextExam}d` : 'None',
      description: daysUntilNextExam !== null ? 'Days remaining' : 'No upcoming exam',
      icon: CalendarDays,
      color: 'text-indigo-600 dark:text-indigo-400',
      bg: 'bg-indigo-50 dark:bg-indigo-950/40',
    },
  ]

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {stats.map((stat, i) => {
        const Icon = stat.icon
        return (
          <Card key={i} className="border border-border/80 shadow-xs">
            <CardContent className="p-4 sm:p-5 flex items-center gap-4">
              <div className={`p-2.5 rounded-lg shrink-0 ${stat.bg}`}>
                <Icon className={`w-5 h-5 ${stat.color}`} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-medium text-muted-foreground truncate">{stat.title}</p>
                <h3 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground mt-0.5">
                  {stat.value}
                </h3>
                <p className="text-[11px] text-muted-foreground truncate mt-0.5">
                  {stat.description}
                </p>
              </div>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}

