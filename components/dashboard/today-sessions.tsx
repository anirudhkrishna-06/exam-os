'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Check, Clock, ChevronRight, BookOpen, AlertCircle } from 'lucide-react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'

export interface TodaySessionItem {
  id: string
  slotName: string
  startTime: string
  endTime: string
  status: 'scheduled' | 'in_progress' | 'completed' | 'skipped' | 'overdue'
  subjectName: string
  subjectColor: string
  unitNumber: number
  unitName: string
  activityType: string
  activityLabel: string
  confidenceRating?: number | null
}

interface TodaySessionsProps {
  sessions: TodaySessionItem[]
  todayIso: string
}

export function TodaySessions({ sessions, todayIso }: TodaySessionsProps) {
  const router = useRouter()
  const [loadingId, setLoadingId] = useState<string | null>(null)

  const toggleComplete = async (sessionId: string, currentStatus: string) => {
    try {
      setLoadingId(sessionId)
      // Completed sessions require a confidence rating. The overview is a
      // summary surface, so send users to the planner for the compact rating
      // interaction instead of bypassing that workflow.
      if (currentStatus !== 'completed' || !sessions.find((session) => session.id === sessionId)?.confidenceRating) {
        router.push(`/planner/${todayIso}`)
        return
      }
      const nextStatus = 'scheduled'
      const res = await fetch(`/api/sessions/${sessionId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: nextStatus }),
      })
      if (res.ok) {
        router.refresh()
      }
    } catch (err) {
      console.error('Failed to update session status', err)
    } finally {
      setLoadingId(null)
    }
  }

  return (
    <Card className="border border-border/80 shadow-xs">
      <CardHeader className="p-4 sm:p-5 pb-3 flex flex-row items-center justify-between border-b border-border/60">
        <div>
          <CardTitle className="text-base font-semibold">Today's Schedule</CardTitle>
          <p className="text-xs text-muted-foreground mt-0.5">
            {sessions.length > 0
              ? `${sessions.filter((s) => s.status === 'completed').length} of ${sessions.length} sessions completed`
              : 'No sessions scheduled for today'}
          </p>
        </div>
        <Link href={`/planner/${todayIso}`}>
          <Button variant="ghost" size="sm" className="text-xs gap-1 h-8">
            Open Planner <ChevronRight className="w-3.5 h-3.5" />
          </Button>
        </Link>
      </CardHeader>
      <CardContent className="p-4 sm:p-5">
        {sessions.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <BookOpen className="w-8 h-8 mx-auto mb-2 opacity-40 text-muted-foreground" />
            <p className="text-sm font-medium">No sessions scheduled for today</p>
            <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
              You have a rest day or have not generated a study plan for this season yet.
            </p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {sessions.map((session) => {
              const isCompleted = session.status === 'completed'
              const isBusy = loadingId === session.id

              return (
                <div
                  key={session.id}
                  className={`flex items-center justify-between p-3 rounded-lg border transition-all ${
                    isCompleted
                      ? 'bg-muted/40 border-border/40 opacity-75'
                      : 'bg-card border-border hover:border-primary/40'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <button
                      onClick={() => toggleComplete(session.id, session.status)}
                      disabled={isBusy || (isCompleted && Boolean(session.confidenceRating))}
                      title={isCompleted ? 'Mark uncompleted' : 'Mark completed'}
                      className={`w-6 h-6 rounded-md border flex items-center justify-center shrink-0 transition-colors ${
                        isCompleted
                          ? 'bg-emerald-600 border-emerald-600 text-white'
                          : 'border-border hover:border-primary bg-background'
                      }`}
                    >
                      {isCompleted && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                    </button>

                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-mono font-medium text-muted-foreground">
                          {session.startTime.slice(0, 5)} - {session.endTime.slice(0, 5)}
                        </span>
                        <span
                          className="w-2 h-2 rounded-full inline-block"
                          style={{ backgroundColor: session.subjectColor }}
                        />
                        <span className="text-xs font-semibold text-foreground truncate">
                          {session.subjectName}
                        </span>
                        <Badge variant="outline" className="text-[10px] py-0 px-1.5 h-4 font-normal">
                          Unit {session.unitNumber}
                        </Badge>
                      </div>

                      <p
                        className={`text-xs mt-0.5 truncate ${
                          isCompleted
                            ? 'line-through text-muted-foreground'
                            : 'text-foreground/90 font-medium'
                        }`}
                      >
                        {session.activityLabel} — {session.unitName}
                      </p>
                    </div>
                  </div>

                  <div className="shrink-0 pl-2">
                    {session.status === 'completed' ? (
                      <Badge className="bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800 text-[10px]">
                        Done
                      </Badge>
                    ) : session.status === 'overdue' ? (
                      <Badge variant="destructive" className="text-[10px]">
                        Overdue
                      </Badge>
                    ) : (
                      <Badge variant="secondary" className="text-[10px]">
                        {session.slotName}
                      </Badge>
                    )}
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

