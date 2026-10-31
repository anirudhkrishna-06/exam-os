'use client'

import Link from 'next/link'
import { Calendar, ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface WelcomeHeaderProps {
  userName: string
  seasonName: string
  todayFormatted: string
  todayIso: string
}

export function WelcomeHeader({
  userName,
  seasonName,
  todayFormatted,
  todayIso,
}: WelcomeHeaderProps) {
  const getGreeting = () => {
    const hour = new Date().getHours()
    if (hour < 12) return 'Good morning'
    if (hour < 17) return 'Good afternoon'
    return 'Good evening'
  }

  return (
    <div className="relative overflow-hidden rounded-2xl border border-primary/10 bg-gradient-to-br from-primary/[0.08] via-card to-card p-5 shadow-sm sm:p-7">
      <div className="pointer-events-none absolute -right-16 -top-20 h-48 w-48 rounded-full bg-primary/10 blur-3xl" />
      <div className="relative flex flex-col justify-between gap-6 md:flex-row md:items-center">
      <div>
        <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">
          <Calendar className="w-3.5 h-3.5" />
          <span>{todayFormatted}</span>
          <span className="text-border">•</span>
          <span className="bg-primary/10 text-primary px-2 py-0.5 rounded-full font-semibold">
            {seasonName}
          </span>
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
          {getGreeting()}, {userName}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground sm:text-base">
          Your preparation at a glance. Stay focused on the next meaningful step.
        </p>
      </div>

      <div className="flex items-center">
        <Link href={`/planner/${todayIso}`}>
          <Button className="gap-2 shadow-sm font-medium">
            <span>Today's Planner</span>
            <ArrowRight className="w-4 h-4" />
          </Button>
        </Link>
      </div>
      </div>
    </div>
  )
}

