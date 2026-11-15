'use client'

import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { CalendarPlus, Check, Clock3, Sparkles } from 'lucide-react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { todayDateString } from '@/lib/date/utils'

type Activity = { id: string; activityType: string; enabled: boolean; status: string }
type Unit = { id: string; unitNumber: number; name: string; difficulty: string; unitActivities: Activity[] }
type Subject = { id: string; name: string; examDate: string; color: string | null; units: Unit[] }
type Slot = { name: string; startTime: string; endTime: string; isEnabled?: boolean }
const activityLabels: Record<string, string> = { theory_1: 'Learn', theory_2: 'Continue', numericals: 'Practice', previous_papers: 'Past papers', revision: 'Revise' }
const activityOrder = ['theory_1', 'theory_2', 'numericals', 'previous_papers', 'revision']

function coverage(unit: Unit) {
  const enabled = unit.unitActivities.filter((activity) => activity.enabled)
  if (enabled.length === 0) return 1
  return enabled.reduce((total, activity) => total + (activity.status === 'completed' ? 1 : activity.status === 'in_progress' ? 0.5 : 0), 0) / enabled.length
}

function leastCoveredUnit(subject?: Subject) {
  return [...(subject?.units ?? [])].sort((a, b) => coverage(a) - coverage(b) || a.unitNumber - b.unitNumber)[0]
}

function nextActivity(unit?: Unit, preferredId?: string) {
  const unfinished = unit?.unitActivities.filter((activity) => activity.enabled && activity.status !== 'completed') ?? []
  return unfinished.find((activity) => activity.id === preferredId)
    ?? [...unfinished].sort((a, b) => activityOrder.indexOf(a.activityType) - activityOrder.indexOf(b.activityType))[0]
}

export function QuickSessionDialog({ open, onOpenChange, seasonId, date, subjects, slots, occupiedSlots = [], onAdded, prefill }: {
  open: boolean; onOpenChange: (open: boolean) => void; seasonId: string; date: string; subjects: Subject[]; slots: Slot[]; occupiedSlots?: string[]; onAdded?: () => void; prefill?: { subjectId?: string; unitId?: string; activityId?: string }
}) {
  const availableSlots = useMemo(() => slots.filter((slot) => slot.isEnabled !== false), [slots])
  const occupied = useMemo(() => new Set(occupiedSlots), [occupiedSlots])
  const freeSlots = useMemo(() => availableSlots.filter((slot) => !occupied.has(slot.name)), [availableSlots, occupied])
  const upcomingSubject = useMemo(() => [...subjects].filter((item) => item.examDate >= date).sort((a, b) => a.examDate.localeCompare(b.examDate))[0] ?? subjects[0], [subjects, date])
  const defaultSubject = subjects.find((item) => item.id === prefill?.subjectId) ?? upcomingSubject
  const defaultUnit = subjects.find((item) => item.id === defaultSubject?.id)?.units.find((item) => item.id === prefill?.unitId) ?? leastCoveredUnit(defaultSubject)
  const defaultActivity = nextActivity(defaultUnit, prefill?.activityId)
  const defaultSlot = useMemo(() => {
    const candidates = freeSlots.length ? freeSlots : []
    const today = todayDateString()
    const timeParts = new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit', hour12: false }).formatToParts(new Date())
    const currentMinutes = Number(timeParts.find((part) => part.type === 'hour')?.value ?? 0) * 60 + Number(timeParts.find((part) => part.type === 'minute')?.value ?? 0)
    return candidates.find((slot) => date !== today || toMinutes(slot.startTime) > currentMinutes) ?? candidates[0]
  }, [date, freeSlots])
  const [subjectId, setSubjectId] = useState(defaultSubject?.id ?? '')
  const subject = subjects.find((item) => item.id === subjectId)
  const [unitId, setUnitId] = useState(defaultUnit?.id ?? '')
  const unit = subject?.units.find((item) => item.id === unitId)
  const activities = unit?.unitActivities.filter((item) => item.enabled && item.status !== 'completed') ?? []
  const [activityId, setActivityId] = useState(defaultActivity?.id ?? '')
  const [slotName, setSlotName] = useState(defaultSlot?.name ?? '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const selectedSlot = useMemo(() => availableSlots.find((slot) => slot.name === slotName), [availableSlots, slotName])

  useEffect(() => {
    if (!open) return
    const next = subjects.find((subject) => subject.id === prefill?.subjectId) ?? upcomingSubject
    const nextUnit = next?.units.find((unit) => unit.id === prefill?.unitId) ?? leastCoveredUnit(next)
    const nextFocus = nextActivity(nextUnit, prefill?.activityId)
    // The dialog is intentionally reset when opened so defaults reflect the latest planner data.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSubjectId(next?.id ?? ''); setUnitId(nextUnit?.id ?? '')
    setActivityId(nextFocus?.id ?? '')
    setSlotName(defaultSlot?.name ?? ''); setError(null)
  }, [open, prefill?.activityId, prefill?.subjectId, prefill?.unitId, upcomingSubject, defaultSlot, subjects])

  function chooseSubject(id: string) {
    const next = subjects.find((item) => item.id === id)
    const nextUnit = leastCoveredUnit(next)
    setSubjectId(id); setUnitId(nextUnit?.id ?? '')
    setActivityId(nextActivity(nextUnit)?.id ?? '')
  }
  function chooseUnit(id: string) {
    const next = subject?.units.find((item) => item.id === id)
    setUnitId(id); setActivityId(nextActivity(next)?.id ?? '')
  }
  async function save() {
    if (!activityId || !selectedSlot || occupied.has(slotName)) return
    setSaving(true); setError(null)
    const response = await fetch(`/api/seasons/${seasonId}/plan`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ activityId, scheduledDate: date, slotName, startTime: selectedSlot.startTime, endTime: selectedSlot.endTime }),
    })
    const data = await response.json(); setSaving(false)
    if (!response.ok) { setError(data.error ?? 'Could not add this session'); return }
    onOpenChange(false); onAdded?.()
  }

  return <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent className="max-h-[90vh] max-w-4xl overflow-y-auto p-0">
      <DialogHeader className="border-b px-6 pb-4 pt-6">
        <DialogTitle className="flex items-center gap-2"><CalendarPlus className="h-5 w-5 text-primary" />Quick add session</DialogTitle>
        <DialogDescription>{new Date(`${date}T00:00:00`).toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}. Pick a few buttons and you’re done.</DialogDescription>
      </DialogHeader>
      <div className="grid gap-6 px-6 pb-6 lg:grid-cols-[minmax(0,1fr)_17rem]">
        <div className="space-y-5">
          <div className="rounded-xl border border-primary/20 bg-primary/[0.04] px-3 py-2.5 text-xs text-muted-foreground"><Sparkles className="mr-1.5 inline h-3.5 w-3.5 text-primary" />Smart defaults are ready — nearest exam, least-covered unit, next focus, and next free slot.</div>
          <ChoiceGroup label="Subject">{subjects.map((item) => <Choice key={item.id} active={subjectId === item.id} onClick={() => chooseSubject(item.id)} color={item.color}>{item.name}<small>{item.examDate === upcomingSubject?.examDate ? 'Next exam' : item.examDate}</small></Choice>)}</ChoiceGroup>
          <ChoiceGroup label="Unit">{subject?.units.map((item) => <Choice key={item.id} active={unitId === item.id} onClick={() => chooseUnit(item.id)}>{item.name || `Unit ${item.unitNumber}`}<small>{Math.round(coverage(item) * 100)}% covered</small></Choice>)}</ChoiceGroup>
          <ChoiceGroup label="Focus">{activities.map((item) => <Choice key={item.id} active={activityId === item.id} onClick={() => setActivityId(item.id)}>{activityLabels[item.activityType] ?? item.activityType}</Choice>)}</ChoiceGroup>
          <ChoiceGroup label="Time">{availableSlots.map((item) => <Choice key={item.name} active={slotName === item.name} disabled={occupied.has(item.name)} onClick={() => setSlotName(item.name)}><Clock3 className="h-3.5 w-3.5" />{item.name}<small>{occupied.has(item.name) ? 'Booked' : item.startTime.slice(0, 5)}</small></Choice>)}</ChoiceGroup>
        </div>
        <aside className="flex flex-col rounded-2xl border bg-muted/30 p-4 lg:sticky lg:top-0 lg:min-h-[20rem]">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Session summary</p>
          <div className="mt-4 space-y-3 text-sm">
            <SummaryRow label="Subject" value={subject?.name ?? 'Choose a subject'} />
            <SummaryRow label="Unit" value={unit?.name ?? 'Choose a unit'} />
            <SummaryRow label="Focus" value={activityLabels[activities.find((a) => a.id === activityId)?.activityType ?? ''] ?? 'Choose a focus'} />
            <SummaryRow label="Time" value={selectedSlot ? `${selectedSlot.name} · ${selectedSlot.startTime.slice(0, 5)}` : 'Choose a slot'} />
          </div>
          <div className="mt-auto border-t pt-4">
            <p className="mb-4 rounded-lg bg-background px-3 py-2 text-xs text-muted-foreground">This session uses the full selected time slot. Booked slots stay unavailable.</p>
            {error && <p className="mb-3 text-sm text-destructive">{error}</p>}
            <Button className="w-full" disabled={saving || !activityId || !selectedSlot} onClick={save}>{saving ? 'Adding…' : <><Check className="h-4 w-4" />Add session</>}</Button>
          </div>
        </aside>
      </div>
    </DialogContent>
  </Dialog>
}

function toMinutes(value: string) { const [hours, minutes] = value.split(':').map(Number); return hours * 60 + minutes }
function ChoiceGroup({ label, children }: { label: string; children: ReactNode }) { return <div className="space-y-2"><p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{label}</p><div className="flex flex-wrap gap-2">{children}</div></div> }
function Choice({ active, onClick, children, color, disabled = false }: { active: boolean; onClick: () => void; children: ReactNode; color?: string | null; disabled?: boolean }) { return <button type="button" onClick={onClick} disabled={disabled} className={`inline-flex min-h-9 items-center gap-2 rounded-full border px-3 py-1.5 text-sm transition-colors ${active ? 'border-primary bg-primary text-primary-foreground shadow-sm' : disabled ? 'cursor-not-allowed bg-muted/50 text-muted-foreground line-through' : 'bg-background hover:bg-muted'}`}><span className="h-2 w-2 rounded-full" style={{ backgroundColor: active ? 'currentColor' : (color ?? 'hsl(var(--primary))') }} />{children}</button> }
function SummaryRow({ label, value }: { label: string; value: string }) { return <div><p className="text-[11px] text-muted-foreground">{label}</p><p className="truncate font-medium" title={value}>{value}</p></div> }
