'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { ArrowUpRight, BookOpen, CalendarDays, Coffee, Play, TrendingUp } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'

export interface OverviewTask {
  id: string
  slotName: string
  startTime: string
  endTime: string
  status: 'scheduled' | 'in_progress' | 'completed' | 'skipped' | 'overdue'
  subjectName: string
  subjectColor: string
  unitName: string
  activityLabel: string
  href: string
}

interface NextExam {
  subjectId: string
  subjectName: string
  color: string
  examDate: string
  daysRemaining: number
  percentComplete: number
}

function minutes(value: string) {
  const [hours, mins] = value.slice(0, 5).split(':').map(Number)
  return hours * 60 + mins
}

function timeLabel(value: string) {
  const [hours, mins] = value.slice(0, 5).split(':').map(Number)
  const date = new Date()
  date.setHours(hours, mins, 0, 0)
  return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
}

function TaskDetails({ task, showTime = false }: { task: OverviewTask; showTime?: boolean }) {
  return <>
    <div className="flex items-start gap-3"><span className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: task.subjectColor }} /><div className="min-w-0"><p className="truncate text-sm font-semibold">{task.unitName}</p><p className="mt-1 truncate text-xs text-muted-foreground">{task.activityLabel} · {task.subjectName}</p>{showTime && <p className="mt-2 text-xs font-medium text-primary">{timeLabel(task.startTime)} – {timeLabel(task.endTime)}</p>}</div></div>
    <Link href={task.href} className="mt-4 inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline">Open workspace <ArrowUpRight className="h-3.5 w-3.5" /></Link>
  </>
}

export function CurrentTaskOverview({ tasks, nextExam }: { tasks: OverviewTask[]; nextExam: NextExam | null }) {
  const [now, setNow] = useState<number | null>(null)

  useEffect(() => {
    const update = () => setNow(new Date().getHours() * 60 + new Date().getMinutes())
    update()
    const timer = window.setInterval(update, 30_000)
    return () => window.clearInterval(timer)
  }, [])

  const taskState = useMemo(() => {
    if (now === null) return { current: null, upcoming: null }
    const active = tasks.find((task) => task.status !== 'skipped' && minutes(task.startTime) <= now && now < minutes(task.endTime)) ?? null
    const upcoming = tasks.filter((task) => task.status !== 'completed' && task.status !== 'skipped' && minutes(task.startTime) > now).sort((a, b) => minutes(a.startTime) - minutes(b.startTime))[0] ?? null
    return { current: active, upcoming }
  }, [now, tasks])

  return <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
    <Card className="border-primary/20 bg-primary/[0.035]"><CardContent className="p-5"><div className="mb-4 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-primary"><Play className="h-3.5 w-3.5" />Current task</div>{taskState.current ? <TaskDetails task={taskState.current} /> : <div className="py-2"><Coffee className="h-7 w-7 text-muted-foreground/60" /><p className="mt-3 text-sm font-semibold">Enjoy your break</p><p className="mt-1 text-xs text-muted-foreground">Nothing is scheduled right now.</p></div>}</CardContent></Card>
    <Card><CardContent className="p-5"><div className="mb-4 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground"><BookOpen className="h-3.5 w-3.5" />Upcoming task</div>{taskState.upcoming ? <TaskDetails task={taskState.upcoming} showTime /> : <div className="py-2"><p className="text-sm font-semibold">Enjoy your break</p><p className="mt-1 text-xs text-muted-foreground">No more sessions are scheduled today.</p></div>}</CardContent></Card>
    <Card><CardContent className="p-5"><div className="mb-4 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground"><CalendarDays className="h-3.5 w-3.5" />Next exam subject</div>{nextExam ? <Link href={`/subjects/${nextExam.subjectId}`} className="block group"><div className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: nextExam.color }} /><p className="truncate text-sm font-semibold group-hover:text-primary">{nextExam.subjectName}</p></div><p className="mt-3 text-2xl font-bold tracking-tight">{nextExam.daysRemaining === 0 ? 'Today' : `${nextExam.daysRemaining} days`}</p><p className="mt-1 text-xs text-muted-foreground">until {new Date(`${nextExam.examDate}T12:00:00`).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</p></Link> : <p className="py-2 text-sm text-muted-foreground">No upcoming exam.</p>}</CardContent></Card>
    <Card><CardContent className="p-5"><div className="mb-4 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground"><TrendingUp className="h-3.5 w-3.5" />Subject progress</div>{nextExam ? <Link href={`/subjects/${nextExam.subjectId}`} className="block"><p className="truncate text-sm font-semibold">{nextExam.subjectName}</p><p className="mt-3 text-2xl font-bold tracking-tight">{nextExam.percentComplete}%</p><div className="mt-3 h-2 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full" style={{ width: `${nextExam.percentComplete}%`, backgroundColor: nextExam.color }} /></div></Link> : <p className="py-2 text-sm text-muted-foreground">Progress will appear here.</p>}</CardContent></Card>
  </div>
}
