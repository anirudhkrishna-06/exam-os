'use client'

import { useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { CalendarPlus, Check, Clock3 } from 'lucide-react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

type Activity = { id: string; activityType: string; enabled: boolean; status: string }
type Unit = { id: string; unitNumber: number; name: string; difficulty: string; unitActivities: Activity[] }
type Subject = { id: string; name: string; examDate: string; color: string | null; units: Unit[] }
type Slot = { name: string; startTime: string; endTime: string; isEnabled?: boolean }

const activityLabels: Record<string, string> = {
  theory_1: 'Learn', theory_2: 'Continue', numericals: 'Practice', previous_papers: 'Past papers', revision: 'Revise',
}

interface QuickSessionDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  seasonId: string
  date: string
  subjects: Subject[]
  slots: Slot[]
  onAdded?: () => void
}

export function QuickSessionDialog({ open, onOpenChange, seasonId, date, subjects, slots, onAdded }: QuickSessionDialogProps) {
  const availableSlots = slots.filter((slot) => slot.isEnabled !== false)
  const [subjectId, setSubjectId] = useState(subjects[0]?.id ?? '')
  const subject = subjects.find((item) => item.id === subjectId)
  const [unitId, setUnitId] = useState(subject?.units[0]?.id ?? '')
  const unit = subject?.units.find((item) => item.id === unitId)
  const activities = unit?.unitActivities.filter((item) => item.enabled && item.status !== 'completed') ?? []
  const [activityId, setActivityId] = useState(activities[0]?.id ?? '')
  const [slotName, setSlotName] = useState(availableSlots[0]?.name ?? '')
  const [duration, setDuration] = useState(60)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const selectedSlot = useMemo(() => availableSlots.find((slot) => slot.name === slotName), [availableSlots, slotName])

  useEffect(() => {
    if (!open) return
    const nextSubject = subjects[0]
    setSubjectId(nextSubject?.id ?? '')
    setUnitId(nextSubject?.units[0]?.id ?? '')
    setActivityId(nextSubject?.units[0]?.unitActivities.find((a) => a.enabled && a.status !== 'completed')?.id ?? '')
    setSlotName(availableSlots[0]?.name ?? '')
    setError(null)
  }, [open]) // eslint-disable-line react-hooks/exhaustive-deps

  function chooseSubject(id: string) {
    const next = subjects.find((item) => item.id === id)
    const nextUnit = next?.units[0]
    setSubjectId(id); setUnitId(nextUnit?.id ?? '')
    setActivityId(nextUnit?.unitActivities.find((a) => a.enabled && a.status !== 'completed')?.id ?? '')
  }
  function chooseUnit(id: string) {
    const next = subject?.units.find((item) => item.id === id)
    setUnitId(id); setActivityId(next?.unitActivities.find((a) => a.enabled && a.status !== 'completed')?.id ?? '')
  }
  async function save() {
    if (!subject || !unit || !activityId || !selectedSlot) return
    setSaving(true); setError(null)
    const response = await fetch(`/api/seasons/${seasonId}/plan`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ activityId, scheduledDate: date, slotName, startTime: selectedSlot.startTime, endTime: selectedSlot.endTime, estimatedDurationMinutes: duration }),
    })
    const data = await response.json()
    setSaving(false)
    if (!response.ok) { setError(data.error ?? 'Could not add this session'); return }
    onOpenChange(false); onAdded?.()
  }

  return <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent className="max-w-xl">
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2"><CalendarPlus className="h-5 w-5 text-primary" />Quick add session</DialogTitle>
        <DialogDescription>{new Date(`${date}T00:00:00`).toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}. Pick a few buttons and you’re done.</DialogDescription>
      </DialogHeader>
      <div className="space-y-5">
        <ChoiceGroup label="Subject">
          {subjects.map((item) => <Choice key={item.id} active={subjectId === item.id} onClick={() => chooseSubject(item.id)} color={item.color}>{item.name}</Choice>)}
        </ChoiceGroup>
        <ChoiceGroup label="Unit">
          {subject?.units.map((item) => <Choice key={item.id} active={unitId === item.id} onClick={() => chooseUnit(item.id)}>{item.name || `Unit ${item.unitNumber}`}<small>{item.difficulty}</small></Choice>)}
        </ChoiceGroup>
        <ChoiceGroup label="Focus">
          {activities.map((item) => <Choice key={item.id} active={activityId === item.id} onClick={() => setActivityId(item.id)}>{activityLabels[item.activityType] ?? item.activityType}</Choice>)}
        </ChoiceGroup>
        <ChoiceGroup label="Time">
          {availableSlots.map((item) => <Choice key={item.name} active={slotName === item.name} onClick={() => setSlotName(item.name)}><Clock3 className="h-3.5 w-3.5" />{item.name}<small>{item.startTime.slice(0, 5)}</small></Choice>)}
        </ChoiceGroup>
        <div className="flex items-center justify-between gap-3 border-t pt-4"><span className="text-sm text-muted-foreground">How long?</span><div className="flex items-center gap-2"><Button type="button" size="icon" variant="outline" className="rounded-full" onClick={() => setDuration(Math.max(15, duration - 15))}>−</Button><Input className="h-9 w-20 text-center" type="number" min={15} max={240} value={duration} onChange={(e) => setDuration(Number(e.target.value))} /><span className="text-sm text-muted-foreground">min</span><Button type="button" size="icon" variant="outline" className="rounded-full" onClick={() => setDuration(Math.min(240, duration + 15))}>+</Button></div></div>
        {error && <p className="text-sm text-destructive">{error}</p>}
        <Button className="w-full" disabled={saving || !activityId || !selectedSlot} onClick={save}>{saving ? 'Adding…' : <><Check className="h-4 w-4" />Add session</>}</Button>
      </div>
    </DialogContent>
  </Dialog>
}

function ChoiceGroup({ label, children }: { label: string; children: ReactNode }) { return <div className="space-y-2"><p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{label}</p><div className="flex flex-wrap gap-2">{children}</div></div> }
function Choice({ active, onClick, children, color }: { active: boolean; onClick: () => void; children: ReactNode; color?: string | null }) { return <button type="button" onClick={onClick} className={`inline-flex min-h-9 items-center gap-2 rounded-full border px-3 py-1.5 text-sm transition-colors ${active ? 'border-primary bg-primary text-primary-foreground shadow-sm' : 'bg-background hover:bg-muted'}`}><span className="h-2 w-2 rounded-full" style={{ backgroundColor: active ? 'currentColor' : (color ?? 'hsl(var(--primary))') }} />{children}</button> }
