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

export function WelcomeHeader({ userName, seasonName, todayFormatted, todayIso }: WelcomeHeaderProps) {
  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'

  return (
    <div className="border-b border-border/70 pb-6 sm:pb-7">
      <div className="flex flex-col justify-between gap-5 md:flex-row md:items-end">
        <div>
          <div className="mb-2 flex items-center gap-2 text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">
            <Calendar className="h-3.5 w-3.5" />
            <span>{todayFormatted}</span>
            <span className="text-border">·</span>
            <span className="font-semibold text-primary">{seasonName}</span>
          </div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">{greeting}, {userName}</h1>
          <p className="mt-1 text-sm text-muted-foreground sm:text-base">Your preparation at a glance. Stay focused on the next meaningful step.</p>
        </div>
        <Link href={`/planner/${todayIso}`}>
          <Button variant="outline" className="gap-2 font-medium">Today&apos;s Planner <ArrowRight className="h-4 w-4" /></Button>
        </Link>
      </div>
    </div>
  )
}
