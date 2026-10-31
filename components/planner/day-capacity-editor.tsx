'use client'

import { useState } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Coffee, Settings2, Save } from 'lucide-react'

interface DayCapacityEditorProps {
  seasonId: string
  date: string
  initialSessionCount: number
  initialIsRestDay: boolean
  maxSlots: number
  onSaved?: () => void
}

export function DayCapacityEditor({
  seasonId,
  date,
  initialSessionCount,
  initialIsRestDay,
  maxSlots,
  onSaved,
}: DayCapacityEditorProps) {
  const [sessionCount, setSessionCount] = useState(initialSessionCount)
  const [isRestDay, setIsRestDay] = useState(initialIsRestDay)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  const handleSave = async () => {
    setSaving(true)
    setMessage(null)
    try {
      const res = await fetch('/api/capacity', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          seasonId,
          date,
          sessionCount,
          isRestDay,
        }),
      })
      if (!res.ok) throw new Error('Failed to update capacity')
      setMessage('Updated capacity for this day')
      if (onSaved) onSaved()
    } catch (err: any) {
      setMessage(err.message || 'Error updating capacity')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Card className="border">
      <CardHeader className="py-3 px-4 border-b bg-muted/20">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Settings2 className="w-4 h-4 text-muted-foreground" />
            Day Capacity Override ({date})
          </CardTitle>
          <Button
            size="sm"
            variant="outline"
            className="h-7 text-xs"
            disabled={saving}
            onClick={handleSave}
          >
            <Save className="w-3.5 h-3.5 mr-1" />
            {saving ? 'Saving...' : 'Save Override'}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="p-4 space-y-4">
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label className="text-sm font-medium flex items-center gap-1.5">
              <Coffee className="w-4 h-4 text-amber-500" />
              Rest Day
            </Label>
            <p className="text-xs text-muted-foreground">
              Marks this day with zero planned study sessions.
            </p>
          </div>
          <Switch
            checked={isRestDay}
            onCheckedChange={setIsRestDay}
          />
        </div>

        {!isRestDay && (
          <div className="flex items-center justify-between border-t pt-3">
            <div className="space-y-0.5">
              <Label className="text-sm font-medium">Session Count</Label>
              <p className="text-xs text-muted-foreground">
                Max available slots today: {maxSlots}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                className="h-8 w-8 p-0"
                disabled={sessionCount <= 0}
                onClick={() => setSessionCount(Math.max(0, sessionCount - 1))}
              >
                -
              </Button>
              <span className="w-6 text-center font-semibold text-sm">{sessionCount}</span>
              <Button
                variant="outline"
                size="sm"
                className="h-8 w-8 p-0"
                disabled={sessionCount >= maxSlots}
                onClick={() => setSessionCount(Math.min(maxSlots, sessionCount + 1))}
              >
                +
              </Button>
            </div>
          </div>
        )}

        {message && (
          <p className="text-xs text-emerald-600 dark:text-emerald-400 font-medium pt-1">
            {message}
          </p>
        )}
      </CardContent>
    </Card>
  )
}

