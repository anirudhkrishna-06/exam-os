'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { CalendarPlus, ArrowLeft, CheckCircle2 } from 'lucide-react'

type Activity = { id: string; activityType: string; enabled: boolean; status: string }
type Unit = { id: string; unitNumber: number; name: string; difficulty: string; unitActivities: Activity[] }
type Subject = { id: string; name: string; examDate: string; units: Unit[] }
type Slot = { name: string; startTime: string; endTime: string; isEnabled: boolean }
const labels: Record<string, string> = { theory_1: 'Theory 1', theory_2: 'Theory 2', numericals: 'Numericals', previous_papers: 'Previous papers', revision: 'Revision' }

export function PlanGenerator({ seasonId, subjects, slots, defaultDate }: { seasonId: string; subjects: Subject[]; slots: Slot[]; defaultDate: string }) {
  const router = useRouter()
  const [subjectId, setSubjectId] = useState(subjects[0]?.id ?? '')
  const subject = subjects.find((s) => s.id === subjectId)
  const [unitId, setUnitId] = useState(subject?.units[0]?.id ?? '')
  const unit = subject?.units.find((u) => u.id === unitId)
  const [activityId, setActivityId] = useState(unit?.unitActivities.find((a) => a.enabled && a.status !== 'completed')?.id ?? '')
  const [date, setDate] = useState(defaultDate)
  const enabledSlots = slots.filter((s) => s.isEnabled)
  const [slotName, setSlotName] = useState(enabledSlots[0]?.name ?? '')
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const enabledActivities = unit?.unitActivities.filter((a) => a.enabled && a.status !== 'completed') ?? []
  const selectedSlot = enabledSlots.find((s) => s.name === slotName)

  function changeSubject(value: string) {
    const next = subjects.find((s) => s.id === value)
    setSubjectId(value); setUnitId(next?.units[0]?.id ?? '')
    setActivityId(next?.units[0]?.unitActivities.find((a) => a.enabled && a.status !== 'completed')?.id ?? '')
  }
  function changeUnit(value: string) {
    const next = subject?.units.find((u) => u.id === value)
    setUnitId(value); setActivityId(next?.unitActivities.find((a) => a.enabled && a.status !== 'completed')?.id ?? '')
  }
  async function addSession() {
    if (!activityId || !selectedSlot) return
    setSaving(true); setMessage(null)
    const res = await fetch('/api/seasons/' + seasonId + '/plan', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ activityId, scheduledDate: date, slotName, startTime: selectedSlot.startTime, endTime: selectedSlot.endTime }) })
    const data = await res.json(); setSaving(false)
    setMessage(res.ok ? 'Session added. Add another one or open your planner.' : (data.error ?? 'Could not add session'))
  }

  return <div className="mx-auto max-w-3xl space-y-6">
    <Button variant="ghost" size="sm" onClick={() => router.push('/seasons/' + seasonId)}><ArrowLeft className="mr-2 h-4 w-4" />Back to season</Button>
    <Card><CardHeader><p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">Manual planner</p><CardTitle className="text-2xl">Build your day, one session at a time</CardTitle><CardDescription>No automatic schedule will fill your calendar. Choose exactly what you want to study, when you want to study it, and leave the rest open.</CardDescription></CardHeader>
      <CardContent className="space-y-5">
        {message && <Alert><CheckCircle2 className="h-4 w-4" /><AlertDescription>{message}</AlertDescription></Alert>}
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2"><Label>Subject</Label><Select value={subjectId} onChange={(e) => changeSubject(e.target.value)}>{subjects.map((s) => <option key={s.id} value={s.id}>{s.name} · exam {s.examDate}</option>)}</Select></div>
          <div className="space-y-2"><Label>Unit</Label><Select value={unitId} onChange={(e) => changeUnit(e.target.value)}>{subject?.units.map((u) => <option key={u.id} value={u.id}>Unit {u.unitNumber} · {u.name} · {u.difficulty}</option>)}</Select></div>
          <div className="space-y-2"><Label>What will you do?</Label><Select value={activityId} onChange={(e) => setActivityId(e.target.value)}>{enabledActivities.map((a) => <option key={a.id} value={a.id}>{labels[a.activityType] ?? a.activityType}</option>)}</Select></div>
          <div className="space-y-2"><Label>Date</Label><Input type="date" value={date} onChange={(e) => setDate(e.target.value)} /></div>
          <div className="space-y-2"><Label>Time slot</Label><Select value={slotName} onChange={(e) => setSlotName(e.target.value)}>{enabledSlots.map((s) => <option key={s.name} value={s.name}>{s.name} · {s.startTime.slice(0, 5)}–{s.endTime.slice(0, 5)}</option>)}</Select></div>
        </div>
        {unit && <p className="rounded-lg bg-muted/40 px-3 py-2 text-xs text-muted-foreground">{unit.name} is marked <span className="font-semibold text-foreground">{unit.difficulty}</span>. Use that as a cue for effort; the app will not force extra sessions.</p>}
        <Button className="w-full sm:w-auto" disabled={saving || !activityId || !selectedSlot || !date} onClick={addSession}><CalendarPlus className="mr-2 h-4 w-4" />{saving ? 'Adding…' : 'Add session to planner'}</Button>
      </CardContent>
    </Card>
  </div>
}
