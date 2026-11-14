'use client'

import { useState, useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Select } from '@/components/ui/select'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Plus, Trash2, GripVertical, Clock, Globe, Save } from 'lucide-react'
import { ThemeControls } from '@/components/theme/theme-controls'

interface Slot {
  id: string
  name: string
  startTime: string
  endTime: string
  position: number
  isEnabled: boolean
}

interface Preferences {
  id: string
  timezone: string
  defaultSessionsPerDay: number
}

const COMMON_TIMEZONES = [
  'Asia/Kolkata',
  'UTC',
  'America/New_York',
  'America/Chicago',
  'America/Denver',
  'America/Los_Angeles',
  'Europe/London',
  'Europe/Paris',
  'Europe/Berlin',
  'Asia/Dubai',
  'Asia/Singapore',
  'Asia/Tokyo',
  'Australia/Sydney',
]

export function SettingsView({
  initialSlots,
  initialPreferences,
}: {
  initialSlots: Slot[]
  initialPreferences: Preferences
}) {
  const [isPending, startTransition] = useTransition()
  const [slots, setSlots] = useState<Slot[]>(initialSlots)
  const [defaultSessions, setDefaultSessions] = useState(initialPreferences?.defaultSessionsPerDay ?? 4)
  const [timezone, setTimezone] = useState(initialPreferences?.timezone ?? 'Asia/Kolkata')
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  function addSlot() {
    const newSlot: Slot = {
      id: Math.random().toString(36).slice(2),
      name: 'New Session',
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

  const enabledCount = slots.filter((s) => s.isEnabled).length

  async function handleSave() {
    setError(null)
    setSuccess(null)

    if (defaultSessions > enabledCount && enabledCount > 0) {
      setError(`Default sessions (${defaultSessions}) cannot exceed enabled slots (${enabledCount})`)
      return
    }

    startTransition(async () => {
      try {
        const res = await fetch('/api/settings', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            slots: slots.map((s, i) => ({
              id: s.id.length === 36 ? s.id : undefined,
              name: s.name,
              startTime: s.startTime,
              endTime: s.endTime,
              position: i,
              isEnabled: s.isEnabled,
            })),
            defaultSessionsPerDay: defaultSessions,
          }),
        })

        const data = await res.json()
        if (!res.ok) {
          setError(data.error || 'Failed to save settings')
          return
        }

        setSuccess('Settings saved successfully')
        setTimeout(() => setSuccess(null), 3000)
      } catch {
        setError('Failed to save settings')
      }
    })
  }

  return (
    <div className="space-y-6">
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {success && (
        <Alert className="border-green-500/50 text-green-700 bg-green-50 dark:bg-green-950 dark:text-green-300">
          <AlertDescription>{success}</AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Appearance</CardTitle>
          <CardDescription>Choose how paramaa... padi da looks across your workspace.</CardDescription>
        </CardHeader>
        <CardContent>
          <ThemeControls />
        </CardContent>
      </Card>

      {/* Routine & Preferences */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Globe className="h-4 w-4 text-primary" />
            <CardTitle className="text-base">Regional & Routine Preferences</CardTitle>
          </div>
          <CardDescription>
            Configure your timezone and target daily study velocity
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="timezone">Timezone</Label>
              <Select
                id="timezone"
                value={timezone}
                onChange={(e) => setTimezone(e.target.value)}
              >
                {COMMON_TIMEZONES.map((tz) => (
                  <option key={tz} value={tz}>
                    {tz}
                  </option>
                ))}
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="defaultSessions">Target study sessions per day</Label>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="h-9 w-9"
                  onClick={() => setDefaultSessions(Math.max(1, defaultSessions - 1))}
                >
                  −
                </Button>
                <Input
                  id="defaultSessions"
                  type="number"
                  min={1}
                  max={Math.max(1, enabledCount)}
                  value={defaultSessions}
                  onChange={(e) => setDefaultSessions(parseInt(e.target.value, 10) || 1)}
                  className="h-9 text-center font-bold"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="h-9 w-9"
                  onClick={() => setDefaultSessions(Math.min(Math.max(1, enabledCount), defaultSessions + 1))}
                >
                  +
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Max available enabled slots: {enabledCount}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Daily schedule slots */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-primary" />
              <CardTitle className="text-base">Daily Study Time Slots</CardTitle>
            </div>
            <Button type="button" variant="outline" size="sm" onClick={addSlot}>
              <Plus className="h-3.5 w-3.5 mr-1.5" />
              Add slot
            </Button>
          </div>
          <CardDescription>
            Customize your regular daily study blocks. Enable, reorder or adjust timings.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {slots.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">No time slots configured.</p>
          ) : (
            slots.map((slot) => (
              <div
                key={slot.id}
                className="flex items-center gap-2 p-3 rounded-lg border bg-card/60 transition-colors"
              >
                <GripVertical className="h-4 w-4 text-muted-foreground shrink-0" />

                <Switch
                  checked={slot.isEnabled}
                  onCheckedChange={(checked) => updateSlot(slot.id, { isEnabled: checked })}
                />

                <Input
                  value={slot.name}
                  onChange={(e) => updateSlot(slot.id, { name: e.target.value })}
                  className="flex-1 min-w-0 h-8 text-sm"
                  placeholder="Slot label"
                />

                <Input
                  type="time"
                  value={slot.startTime}
                  onChange={(e) => updateSlot(slot.id, { startTime: e.target.value })}
                  className="w-28 h-8 text-xs"
                />
                <span className="text-muted-foreground text-xs shrink-0">to</span>
                <Input
                  type="time"
                  value={slot.endTime}
                  onChange={(e) => updateSlot(slot.id, { endTime: e.target.value })}
                  className="w-28 h-8 text-xs"
                />

                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive"
                  onClick={() => removeSlot(slot.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))
          )}

          <div className="pt-4 flex justify-end">
            <Button type="button" onClick={handleSave} disabled={isPending} className="px-6">
              <Save className="h-4 w-4 mr-2" />
              {isPending ? 'Saving changes…' : 'Save preferences'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

