import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { CalendarRange, CheckCircle2, AlertCircle, Clock, CalendarCheck } from 'lucide-react'

export interface WorkloadStats {
  plannedThisWeek: number
  completedThisWeek: number
  overdueSessions: number
  remainingSessions: number
  daysWithCapacity: number
}

interface WorkloadOverviewProps {
  stats: WorkloadStats
}

export function WorkloadOverview({ stats }: WorkloadOverviewProps) {
  const items = [
    {
      label: 'Planned This Week',
      value: stats.plannedThisWeek,
      icon: CalendarRange,
      color: 'text-blue-600 dark:text-blue-400',
    },
    {
      label: 'Completed This Week',
      value: stats.completedThisWeek,
      icon: CheckCircle2,
      color: 'text-emerald-600 dark:text-emerald-400',
    },
    {
      label: 'Overdue Sessions',
      value: stats.overdueSessions,
      icon: AlertCircle,
      color: stats.overdueSessions > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-muted-foreground',
    },
    {
      label: 'Remaining Sessions',
      value: stats.remainingSessions,
      icon: Clock,
      color: 'text-amber-600 dark:text-amber-400',
    },
    {
      label: 'Days with Available Capacity',
      value: stats.daysWithCapacity,
      icon: CalendarCheck,
      color: 'text-indigo-600 dark:text-indigo-400',
    },
  ]

  return (
    <Card className="border border-border/80 shadow-xs">
      <CardHeader className="p-4 sm:p-5 pb-3 border-b border-border/60">
        <CardTitle className="text-base font-semibold">Workload & Capacity Summary</CardTitle>
        <p className="text-xs text-muted-foreground mt-0.5">
          Real-time weekly pacing and slot availability
        </p>
      </CardHeader>
      <CardContent className="p-4 sm:p-5">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {items.map((item, idx) => {
            const Icon = item.icon
            return (
              <div
                key={idx}
                className="p-3 rounded-lg border border-border/60 bg-muted/20 flex flex-col justify-between"
              >
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1.5">
                  <Icon className={`w-3.5 h-3.5 ${item.color}`} />
                  <span className="truncate">{item.label}</span>
                </div>
                <div className="text-xl font-bold tracking-tight text-foreground">
                  {item.value}
                </div>
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}

