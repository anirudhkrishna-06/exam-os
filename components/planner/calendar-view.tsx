'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Coffee, BookOpen, Plus } from 'lucide-react'
import { QuickSessionDialog } from './quick-session-dialog'
import { todayDateString } from '@/lib/date/utils'

interface CalendarSession {
  id: string
  scheduledDate: string
  slotName: string
  status: string
  activity?: {
    activityType: string
    unit: {
      id: string
      name: string
      unitNumber: number
      subject: {
        id: string
        name: string
        color: string | null
        examDate: string
      }
    }
  }
}

interface CalendarViewProps {
  initialYear: number
  initialMonth: number
  sessionsByDate: Record<string, CalendarSession[]>
  examDates?: Array<{ subjectId: string; subjectName: string; examDate: string; color: string }>
  restDates?: string[]
  seasonId: string
  subjects: Array<{ id: string; name: string; examDate: string; color: string | null; units: Array<{ id: string; unitNumber: number; name: string; difficulty: string; unitActivities: Array<{ id: string; activityType: string; enabled: boolean; status: string }> }> }>
  slots: Array<{ name: string; startTime: string; endTime: string; isEnabled?: boolean }>
}

export function CalendarView({
  initialYear,
  initialMonth,
  sessionsByDate,
  examDates = [],
  restDates = [],
  seasonId,
  subjects,
  slots,
}: CalendarViewProps) {
  const router = useRouter()
  const [year, setYear] = useState(initialYear)
  const [month, setMonth] = useState(initialMonth) // 1-12
  const [quickDate, setQuickDate] = useState<string | null>(null)

  const navigateMonth = (offset: number) => {
    let nextMonth = month + offset
    let nextYear = year
    if (nextMonth < 1) {
      nextMonth = 12
      nextYear -= 1
    } else if (nextMonth > 12) {
      nextMonth = 1
      nextYear += 1
    }
    setMonth(nextMonth)
    setYear(nextYear)
    router.push(`/planner/calendar?year=${nextYear}&month=${nextMonth}`)
  }

  // Days calculations
  const daysInMonth = new Date(year, month, 0).getDate()
  const firstDayOfWeek = new Date(year, month - 1, 1).getDay() // 0 = Sun
  const todayStr = todayDateString()

  // Map exam dates
  const examMap = new Map<string, Array<{ subjectId: string; subjectName: string; color: string }>>()
  for (const e of examDates) {
    const list = examMap.get(e.examDate) ?? []
    list.push(e)
    examMap.set(e.examDate, list)
  }

  const restSet = new Set(restDates)

  const monthName = new Date(year, month - 1, 1).toLocaleString('default', { month: 'long' })
  const dayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between bg-card border rounded-lg p-4">
        <div>
          <span className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">
            Study Calendar
          </span>
          <h2 className="text-xl font-bold">{monthName} {year}</h2>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigateMonth(-1)}
          >
            <ChevronLeft className="w-4 h-4 mr-1" />
            Prev
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              const [currentYear, currentMonth] = todayStr.split('-').map(Number)
              setYear(currentYear)
              setMonth(currentMonth)
              router.push('/planner/calendar')
            }}
          >
            Current Month
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigateMonth(1)}
          >
            Next
            <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
          <Button
            variant="default"
            size="sm"
            onClick={() => router.push(`/planner/${todayStr}`)}
          >
            Today's Planner
          </Button>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="bg-card border rounded-lg overflow-hidden">
        {/* Day-of-week headers */}
        <div className="grid grid-cols-7 border-b bg-muted/30 text-center py-2 text-xs font-semibold text-muted-foreground">
          {dayLabels.map((lbl) => (
            <div key={lbl}>{lbl}</div>
          ))}
        </div>

        {/* Days grid */}
        <div className="grid grid-cols-7 auto-rows-fr divide-x divide-y border-b">
          {/* Empty cells before month starts */}
          {Array.from({ length: firstDayOfWeek }).map((_, i) => (
            <div key={`empty-${i}`} className="min-h-[100px] bg-muted/10 p-2 opacity-30" />
          ))}

          {/* Days in month */}
          {Array.from({ length: daysInMonth }).map((_, i) => {
            const dayNum = i + 1
            const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`
            const daySessions = sessionsByDate[dateStr] || []
            const completedCount = daySessions.filter((s) => s.status === 'completed').length
            const isToday = dateStr === todayStr
            const isRest = restSet.has(dateStr)
            const exams = examMap.get(dateStr) || []

            return (
              <div
                key={dateStr}
                onClick={() => router.push(`/planner/${dateStr}`)}
                className={`min-h-[100px] p-2 transition-all cursor-pointer hover:bg-muted/30 flex flex-col justify-between ${
                  isToday ? 'bg-primary/5 ring-1 ring-inset ring-primary' : ''
                }`}
              >
                {/* Day Header */}
                <div className="flex items-center justify-between">
                  <span
                    className={`text-xs font-semibold rounded-full w-6 h-6 flex items-center justify-center ${
                      isToday
                        ? 'bg-primary text-primary-foreground font-bold'
                        : 'text-foreground'
                    }`}
                  >
                    {dayNum}
                  </span>

                  {isRest && (
                    <span title="Rest Day">
                      <Coffee className="w-3.5 h-3.5 text-amber-500" />
                    </span>
                  )}
                  <button type="button" className="rounded-full p-1 text-muted-foreground hover:bg-primary/10 hover:text-primary" title="Add session" onClick={(event) => { event.stopPropagation(); setQuickDate(dateStr) }}>
                    <Plus className="h-3.5 w-3.5" />
                  </button>
                </div>

                {/* Badges / indicators */}
                <div className="space-y-1 my-1">
                  {exams.map((e, idx) => (
                    <button
                      key={idx}
                      type="button"
                      className="text-[10px] font-semibold px-1.5 py-0.5 rounded text-white truncate"
                      style={{ backgroundColor: e.color || '#ef4444' }}
                      title={`Open ${e.subjectName}`}
                      onClick={(event) => { event.stopPropagation(); router.push(`/subjects/${e.subjectId}`) }}
                    >
                      EXAM: {e.subjectName}
                    </button>
                  ))}

                  {daySessions.length > 0 && (
                    <div className="space-y-1 text-[11px] font-medium text-muted-foreground">
                      {daySessions.slice(0, 2).map((session) => (
                        <button key={session.id} type="button" onClick={(event) => { event.stopPropagation(); router.push(`/sessions/${session.id}`) }} className="flex w-full items-center gap-1.5 truncate rounded px-1 py-0.5 text-left hover:bg-primary/10 hover:text-primary">
                          <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${session.status === 'completed' ? 'bg-emerald-500' : session.status === 'overdue' ? 'bg-red-500' : session.status === 'skipped' ? 'bg-muted-foreground' : 'bg-primary'}`} />
                          <span className="truncate">{session.activity?.unit.name || session.slotName}</span>
                        </button>
                      ))}
                      {daySessions.length > 2 && <span className="block px-1">+{daySessions.length - 2} more</span>}
                      {completedCount > 0 && (
                        <span className="text-emerald-600 dark:text-emerald-400 font-semibold text-[10px]">
                          ✓ {completedCount}
                        </span>
                      )}
                    </div>
                  )}
                </div>

                {/* Micro preview dots of subjects */}
                <div className="flex gap-1 overflow-hidden pt-1">
                  {daySessions.slice(0, 4).map((s, idx) => {
                    const color = s.activity?.unit.subject.color || '#3b82f6'
                    return (
                      <span
                        key={idx}
                        className="w-1.5 h-1.5 rounded-full shrink-0"
                        style={{ backgroundColor: color }}
                      />
                    )
                  })}
                  {daySessions.length > 4 && (
                    <span className="text-[9px] text-muted-foreground leading-none">
                      +{daySessions.length - 4}
                    </span>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>
      {quickDate && <QuickSessionDialog open={!!quickDate} onOpenChange={(open) => !open && setQuickDate(null)} seasonId={seasonId} date={quickDate} subjects={subjects} slots={slots} onAdded={() => { setQuickDate(null); router.refresh() }} />}
    </div>
  )
}
