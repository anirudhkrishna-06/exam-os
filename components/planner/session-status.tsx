'use client'

import { Badge } from '@/components/ui/badge'

interface SessionStatusProps {
  status: 'scheduled' | 'in_progress' | 'completed' | 'skipped' | 'overdue'
}

export function SessionStatus({ status }: SessionStatusProps) {
  switch (status) {
    case 'completed':
      return <Badge variant="secondary" className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30">Completed</Badge>
    case 'in_progress':
      return <Badge variant="secondary" className="bg-blue-500/15 text-blue-700 dark:text-blue-400 border-blue-500/30">In Progress</Badge>
    case 'skipped':
      return <Badge variant="secondary" className="border-border bg-muted/70 text-muted-foreground">Skipped</Badge>
    case 'overdue':
      return <Badge variant="destructive" className="bg-rose-500/15 text-rose-700 dark:text-rose-400 border-rose-500/30">Overdue</Badge>
    case 'scheduled':
    default:
      return <Badge variant="outline" className="text-muted-foreground">Scheduled</Badge>
  }
}

