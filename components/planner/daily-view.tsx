'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { SessionCard, type SessionCardData } from './session-card'
import { SessionEditor } from './session-editor'
import { DayCapacityEditor } from './day-capacity-editor'
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Coffee, Sparkles, Target, Plus } from 'lucide-react'
import { QuickSessionDialog } from './quick-session-dialog'
import { todayDateString } from '@/lib/date/utils'

type QuickSubject = { id: string; name: string; examDate: string; color: string | null; units: Array<{ id: string; unitNumber: number; name: string; difficulty: string; unitActivities: Array<{ id: string; activityType: string; enabled: boolean; status: string }> }> }

interface DailyViewProps {
  date: string
  seasonId?: string
  sessions: SessionCardData[]
  templates: Array<{
    id: string
    name: string
    startTime: string
    endTime: string
    position: number
  }>
  capacityOverride?: {
    sessionCount: number
    isRestDay: boolean
  } | null
  defaultSessionsPerDay: number
  upcomingExams: Array<{
    name: string
    examDate: string
    color: string
  }>
  subjects: QuickSubject[]
}

export function DailyView({
  date,
  seasonId,
  sessions,
  templates,
  capacityOverride,
  defaultSessionsPerDay,
  upcomingExams,
  subjects,
}: DailyViewProps) {
  const router = useRouter()
  const [selectedSession, setSelectedSession] = useState<SessionCardData | null>(null)
  const [editorOpen, setEditorOpen] = useState(false)
  const [quickAddOpen, setQuickAddOpen] = useState(false)

  // Navigation helpers
  const navigateDay = (offset: number) => {
    const [year, month, day] = date.split('-').map(Number)
    const d = new Date(year, month - 1, day)
    d.setDate(d.getDate() + offset)
    const nextStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    router.push(`/planner/${nextStr}`)
  }

  const isRestDay = capacityOverride?.isRestDay ?? false
  const targetSessionCount = capacityOverride?.sessionCount ?? defaultSessionsPerDay
  const upcoming = upcomingExams
    .filter((exam) => exam.examDate >= date)
    .sort((a, b) => a.examDate.localeCompare(b.examDate))
  const focusExam = upcoming[0]
  const daysToFocusExam = focusExam
    ? Math.max(0, Math.round((Date.parse(`${focusExam.examDate}T00:00:00Z`) - Date.parse(`${date}T00:00:00Z`)) / 86_400_000))
    : null
  const focusIsNear = daysToFocusExam !== null && daysToFocusExam <= 14

  // Map slots to sessions
  // Map templates sorted by position
  const sortedTemplates = [...templates].sort((a, b) => a.position - b.position)

  // Sessions map by slotName
  const sessionsBySlot = new Map<string, SessionCardData>()
  for (const s of sessions) {
    sessionsBySlot.set(s.slotName, s)
  }

  const handleStatusChange = async (sessionId: string, newStatus: SessionCardData['status']) => {
    const res = await fetch(`/api/sessions/${sessionId}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus }),
    })
    if (res.ok) {
      router.refresh()
    }
  }

  const handleSaveSession = async (
    sessionId: string,
    data: { status: SessionCardData['status']; completionNote?: string; actualDurationMinutes?: number }
  ) => {
    const res = await fetch(`/api/sessions/${sessionId}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    if (res.ok) {
      router.refresh()
    }
  }

  const handleDeleteSession = async (sessionId: string) => {
    const res = await fetch(`/api/sessions/${sessionId}`, {
      method: 'DELETE',
    })
    if (res.ok) {
      router.refresh()
    }
  }

  // Format date display
  const [year, month, day] = date.split('-').map(Number)
  const dateObj = new Date(year, month - 1, day)
  const formattedDate = dateObj.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })

  return (
    <div className="space-y-6">
      {/* Date Header & Nav */}
      <div className="relative overflow-hidden rounded-2xl border bg-gradient-to-br from-card via-card to-primary/5 p-5 shadow-sm sm:p-6">
        <div className="pointer-events-none absolute -right-12 -top-12 h-36 w-36 rounded-full bg-primary/10 blur-2xl" />
        <div className="relative flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
        <div>
          <span className="text-xs uppercase tracking-[0.16em] text-primary font-semibold">
            Daily Planner
          </span>
          <h2 className="mt-1 text-2xl font-bold tracking-tight sm:text-3xl">{formattedDate}</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {isRestDay ? 'Rest day' : `${sessions.length} scheduled / target ${targetSessionCount} sessions`}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            size="sm"
            onClick={() => setQuickAddOpen(true)}
          >
            <Plus className="mr-1 h-4 w-4" /> Add session
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigateDay(-1)}
            title="Previous Day"
          >
            <ChevronLeft className="w-4 h-4 mr-1" />
            Prev
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.push(`/planner/${todayDateString()}`)}
          >
            Today
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigateDay(1)}
            title="Next Day"
          >
            Next
            <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push('/planner/calendar')}
          >
            <CalendarIcon className="w-4 h-4 mr-1" />
            Calendar
          </Button>
        </div>
        </div>
      </div>

      {/* Main Grid: Slots and Capacity */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="min-w-0 space-y-3">
          {isRestDay ? (
            <Card className="border-dashed bg-muted/20">
              <CardContent className="p-8 text-center space-y-2">
                <Coffee className="w-8 h-8 mx-auto text-amber-500" />
                <h3 className="font-semibold text-base">Rest Day Scheduled</h3>
                <p className="text-sm text-muted-foreground max-w-sm mx-auto">
                  Take time to recharge! No study sessions are planned for today.
                </p>
              </CardContent>
            </Card>
          ) : (
            <>
              {sortedTemplates.map((template, idx) => {
                const session = sessionsBySlot.get(template.name)

                if (session) {
                  return (
                    <div key={template.id} className="space-y-1">
                      <div className="flex items-center justify-between text-xs text-muted-foreground px-1">
                        <span className="font-medium text-foreground">{template.name}</span>
                        <span className="tabular-nums">{template.startTime.slice(0, 5)} - {template.endTime.slice(0, 5)}</span>
                      </div>
                      <SessionCard
                        session={session}
                        onStatusChange={handleStatusChange}
                        onEdit={(s) => {
                          setSelectedSession(s)
                          setEditorOpen(true)
                        }}
                      />
                    </div>
                  )
                }

                // Unused slot: Free Slot card (allowed by design, not a failure!)
                return (
                  <div key={template.id} className="space-y-1">
                    <div className="flex items-center justify-between text-xs text-muted-foreground px-1">
                      <span>{template.name}</span>
                      <span className="tabular-nums">{template.startTime.slice(0, 5)} - {template.endTime.slice(0, 5)}</span>
                    </div>
                    <Card className="border border-dashed bg-muted/10 opacity-70">
                      <CardContent className="p-3 flex items-center justify-between">
                        <span className="text-xs text-muted-foreground italic">
                          Free Slot (No study planned)
                        </span>
                        <span className="text-[10px] text-muted-foreground">Unused</span>
                      </CardContent>
                    </Card>
                  </div>
                )
              })}

              {sortedTemplates.length === 0 && (
                <div className="text-center py-12 border border-dashed rounded-lg text-muted-foreground text-sm">
                  No daily session slots configured. Visit Settings to define your daily time slots.
                </div>
              )}
            </>
          )}
        </div>

        {/* Sidebar: Day Capacity & Reschedule */}
        <div className="space-y-4">
          <Card className={focusIsNear ? 'border-primary/25 bg-primary/5' : 'border'}>
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <div className="rounded-xl bg-primary/10 p-2 text-primary">
                  {focusIsNear ? <Target className="h-4 w-4" /> : <Sparkles className="h-4 w-4" />}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    {focusIsNear ? 'Exam focus' : 'Study guidance'}
                  </p>
                  {focusExam ? (
                    <>
                      <p className="mt-1 font-semibold truncate" title={focusExam.name}>
                        {focusExam.name}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {daysToFocusExam === 0
                          ? 'Exam day — protect your energy.'
                          : `${daysToFocusExam} day${daysToFocusExam === 1 ? '' : 's'} to go · keep this as your main subject`}
                      </p>
                      {focusIsNear && upcoming.length > 1 && (
                        <p className="mt-2 text-xs text-muted-foreground">
                          Other subjects stay light until this exam is safely behind you.
                        </p>
                      )}
                    </>
                  ) : (
                    <p className="mt-1 text-sm text-muted-foreground">
                      No upcoming exams yet. Use today to build steady momentum.
                    </p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {seasonId && (
            <DayCapacityEditor
              seasonId={seasonId}
              date={date}
              initialSessionCount={targetSessionCount}
              initialIsRestDay={isRestDay}
              maxSlots={sortedTemplates.length}
              onSaved={() => router.refresh()}
            />
          )}
        </div>
      </div>

      {/* Session Editor Modal */}
      <SessionEditor
        session={selectedSession}
        open={editorOpen}
        onOpenChange={setEditorOpen}
        onSave={handleSaveSession}
        onDelete={handleDeleteSession}
      />
      {seasonId && <QuickSessionDialog open={quickAddOpen} onOpenChange={setQuickAddOpen} seasonId={seasonId} date={date} subjects={subjects} slots={templates} onAdded={() => router.refresh()} />}
    </div>
  )
}

