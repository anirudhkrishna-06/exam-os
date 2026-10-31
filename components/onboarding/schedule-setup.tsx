'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Plus, Trash2, GripVertical } from 'lucide-react'

interface Slot {
  id: string
  name: string
  startTime: string
  endTime: string
  position: number
  isEnabled: boolean
}

const DEFAULT_SLOTS: Slot[] = [
  { id: '1', name: 'Early Morning', startTime: '06:00', endTime: '08:00', position: 0, isEnabled: true },
  { id: '2', name: 'Morning', startTime: '09:00', endTime: '11:00', position: 1, isEnabled: true },
  { id: '3', name: 'Pre-lunch', startTime: '12:00', endTime: '13:30', position: 2, isEnabled: true },
  { id: '4', name: 'Afternoon', startTime: '14:00', endTime: '16:00', position: 3, isEnabled: true },
  { id: '5', name: 'Evening', startTime: '17:00', endTime: '18:00', position: 4, isEnabled: true },
  { id: '6', name: 'Night', startTime: '20:00', endTime: '22:00', position: 5, isEnabled: true },
]

export function ScheduleSetup({ initialSlots = DEFAULT_SLOTS }: { initialSlots?: Slot[] }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [slots, setSlots] = useState<Slot[]>(initialSlots)
  const [defaultSessions, setDefaultSessions] = useState(4)
  const [error, setError] = useState<string | null>(null)

  function addSlot() {
    const newSlot: Slot = {
      id: Math.random().toString(36).slice(2),
      name: 'New slot',
      startTime: '08:00',
      endTime: '09:00',
      position: slots.length,
      isEnabled: true,
    }
    setSlots([...slots, newSlot])
  }

  function removeSlot(id: string) {
    setSlots(slots.filter((s) => s.id !== id).map((s, i) => ({ ...s, position: i })))
  }

  function updateSlot(id: string, changes: Partial<Slot>) {
    setSlots(slots.map((s) => (s.id === id ? { ...s, ...changes } : s)))
  }

  function moveSlot(id: string, direction: 'up' | 'down') {
    const idx = slots.findIndex((s) => s.id === id)
    if (direction === 'up' && idx === 0) return
    if (direction === 'down' && idx === slots.length - 1) return
    const newSlots = [...slots]
    const swapIdx = direction === 'up' ? idx - 1 : idx + 1
    ;[newSlots[idx], newSlots[swapIdx]] = [newSlots[swapIdx], newSlots[idx]]
    setSlots(newSlots.map((s, i) => ({ ...s, position: i })))
  }

  const enabledCount = slots.filter((s) => s.isEnabled).length

  async function handleSave() {
    setError(null)

    if (defaultSessions > enabledCount) {
      setError(`Default sessions (${defaultSessions}) cannot exceed enabled slots (${enabledCount})`)
      return
    }

    startTransition(async () => {
      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          slots: slots.map((s, i) => ({
            name: s.name,
            startTime: s.startTime,
            endTime: s.endTime,
            position: i,
            isEnabled: s.isEnabled,
          })),
          defaultSessionsPerDay: defaultSessions,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        setError(data.error || 'Failed to save settings')
        return
      }

      router.push('/overview')
      router.refresh()
    })
  }

  return (
    <div className="space-y-6">
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="space-y-2">
        {slots.map((slot) => (
          <div key={slot.id} className="flex items-center gap-2 p-3 rounded-lg border bg-card">
            <GripVertical className="h-4 w-4 text-muted-foreground shrink-0" />

            <Switch
              checked={slot.isEnabled}
              onCheckedChange={(checked) => updateSlot(slot.id, { isEnabled: checked })}
            />

            <Input
              value={slot.name}
              onChange={(e) => updateSlot(slot.id, { name: e.target.value })}
              className="flex-1 min-w-0 h-8"
              placeholder="Slot name"
            />

            <Input
              type="time"
              value={slot.startTime}
              onChange={(e) => updateSlot(slot.id, { startTime: e.target.value })}
              className="w-28 h-8"
            />
            <span className="text-muted-foreground text-sm shrink-0">to</span>
            <Input
              type="time"
              value={slot.endTime}
              onChange={(e) => updateSlot(slot.id, { endTime: e.target.value })}
              className="w-28 h-8"
            />

            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-8 w-8 shrink-0 text-destructive hover:text-destructive"
              onClick={() => removeSlot(slot.id)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ))}
      </div>

      <Button type="button" variant="outline" size="sm" onClick={addSlot} className="w-full">
        <Plus className="h-4 w-4 mr-2" />
        Add time slot
      </Button>

      <div className="flex items-center gap-4 p-4 rounded-lg border bg-muted/30">
        <div className="flex-1">
          <Label htmlFor="defaultSessions" className="text-sm font-medium">
            Default sessions per day
          </Label>
          <p className="text-xs text-muted-foreground mt-0.5">
            How many slots to plan per day by default
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="h-8 w-8"
            onClick={() => setDefaultSessions(Math.max(1, defaultSessions - 1))}
          >
            −
          </Button>
          <span className="w-8 text-center font-medium tabular-nums">{defaultSessions}</span>
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="h-8 w-8"
            onClick={() => setDefaultSessions(Math.min(enabledCount, defaultSessions + 1))}
          >
            +
          </Button>
        </div>
      </div>

      <div className="flex gap-3">
        <Button
          type="button"
          variant="outline"
          className="flex-1"
          onClick={() => router.push('/overview')}
        >
          Skip for now
        </Button>
        <Button type="button" className="flex-1" onClick={handleSave} disabled={isPending}>
          {isPending ? 'Saving…' : 'Save and continue'}
        </Button>
      </div>
    </div>
  )
}

