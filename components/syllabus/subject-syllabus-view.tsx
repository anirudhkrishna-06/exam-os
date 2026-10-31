'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Select } from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { CalendarDays, CheckCircle2, ChevronRight, Layers, Sliders, Save, RefreshCw } from 'lucide-react'
import { formatDate, daysUntil } from '@/lib/date/utils'

interface Activity {
  id: string
  unitId: string
  activityType: 'theory_1' | 'theory_2' | 'numericals' | 'previous_papers' | 'revision'
  enabled: boolean
  status: 'not_started' | 'in_progress' | 'completed'
  weight: string
  estimatedSessions: number
}

interface Unit {
  id: string
  unitNumber: number
  name: string
  initialStatus: 'new' | 'partially_studied' | 'previously_studied'
  position: number
  unitActivities: Activity[]
}

interface Subject {
  id: string
  seasonId: string
  name: string
  examDate: string
  color: string | null
  units: Unit[]
}

const ACTIVITY_LABELS: Record<string, string> = {
  theory_1: 'Theory 1',
  theory_2: 'Theory 2',
  numericals: 'Numericals',
  previous_papers: 'Previous Papers',
  revision: 'Revision',
}

const STATUS_LABELS: Record<string, string> = {
  new: 'New',
  partially_studied: 'Partially Studied',
  previously_studied: 'Previously Studied',
}

export function SubjectSyllabusView({ initialSubject }: { initialSubject: Subject }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [subject, setSubject] = useState<Subject>(initialSubject)
  const [feedback, setFeedback] = useState<{ message: string; type: 'success' | 'error' } | null>(null)
  const [editingUnitId, setEditingUnitId] = useState<string | null>(null)
  const [editingUnitName, setEditingUnitName] = useState('')

  function showMessage(message: string, type: 'success' | 'error' = 'success') {
    setFeedback({ message, type })
    setTimeout(() => setFeedback(null), 4000)
  }

  // Update unit status
  async function handleUnitStatusChange(unitId: string, initialStatus: 'new' | 'partially_studied' | 'previously_studied') {
    setSubject((prev) => ({
      ...prev,
      units: prev.units.map((u) => (u.id === unitId ? { ...u, initialStatus } : u)),
    }))

    try {
      const res = await fetch(`/api/units/${unitId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ initialStatus }),
      })
      if (!res.ok) throw new Error('Failed to update unit status')
      showMessage('Unit status updated')
    } catch (err) {
      showMessage('Error saving unit status', 'error')
    }
  }

  // Save renamed unit
  async function handleRenameUnit(unitId: string) {
    if (!editingUnitName.trim()) return

    setSubject((prev) => ({
      ...prev,
      units: prev.units.map((u) => (u.id === unitId ? { ...u, name: editingUnitName.trim() } : u)),
    }))
    setEditingUnitId(null)

    try {
      const res = await fetch(`/api/units/${unitId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: editingUnitName.trim() }),
      })
      if (!res.ok) throw new Error('Failed to rename unit')
      showMessage('Unit renamed successfully')
    } catch {
      showMessage('Error renaming unit', 'error')
    }
  }

  // Update activity details
  async function handleActivityChange(
    unitId: string,
    activityId: string,
    changes: Partial<{ enabled: boolean; weight: number; estimatedSessions: number; status: 'not_started' | 'in_progress' | 'completed' }>
  ) {
    setSubject((prev) => ({
      ...prev,
      units: prev.units.map((u) => {
        if (u.id !== unitId) return u
        return {
          ...u,
          unitActivities: u.unitActivities.map((a) => {
            if (a.id !== activityId) return a
            return {
              ...a,
              ...changes,
              weight: changes.weight !== undefined ? changes.weight.toString() : a.weight,
            }
          }),
        }
      }),
    }))

    try {
      const res = await fetch(`/api/activities/${activityId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(changes),
      })
      if (!res.ok) throw new Error('Failed to update activity')
    } catch {
      showMessage('Failed to save activity change', 'error')
    }
  }

  // Bulk set status to all units
  async function handleBulkUnitStatus(initialStatus: 'new' | 'partially_studied' | 'previously_studied') {
    startTransition(async () => {
      setSubject((prev) => ({
        ...prev,
        units: prev.units.map((u) => ({ ...u, initialStatus })),
      }))

      try {
        const res = await fetch(`/api/subjects/${subject.id}/bulk`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'set_unit_status',
            initialStatus,
          }),
        })
        if (!res.ok) throw new Error('Bulk update failed')
        showMessage(`Set all units to "${STATUS_LABELS[initialStatus]}"`)
      } catch {
        showMessage('Bulk update failed', 'error')
      }
    })
  }

  // Bulk toggle activity across all units
  async function handleBulkActivityToggle(activityType: 'theory_1' | 'theory_2' | 'numericals' | 'previous_papers' | 'revision', enabled: boolean) {
    startTransition(async () => {
      setSubject((prev) => ({
        ...prev,
        units: prev.units.map((u) => ({
          ...u,
          unitActivities: u.unitActivities.map((a) => (a.activityType === activityType ? { ...a, enabled } : a)),
        })),
      }))

      try {
        const res = await fetch(`/api/subjects/${subject.id}/bulk`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'set_activity_enabled',
            activityType,
            enabled,
          }),
        })
        if (!res.ok) throw new Error('Bulk activity toggle failed')
        showMessage(`${enabled ? 'Enabled' : 'Disabled'} ${ACTIVITY_LABELS[activityType]} across all units`)
      } catch {
        showMessage('Failed to bulk toggle activity', 'error')
      }
    })
  }

  const daysLeft = daysUntil(subject.examDate)

  return (
    <div className="space-y-6">
      {/* Subject Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-xl border bg-card shadow-sm">
        <div className="flex items-center gap-3">
          {subject.color && (
            <div className="h-5 w-5 rounded-full shrink-0 shadow-sm" style={{ backgroundColor: subject.color }} />
          )}
          <div>
            <h1 className="text-2xl font-bold tracking-tight">{subject.name}</h1>
            <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
              <CalendarDays className="h-4 w-4" />
              <span>Exam Date: {formatDate(subject.examDate)}</span>
              <Badge variant={daysLeft <= 7 ? 'destructive' : daysLeft <= 30 ? 'warning' : 'secondary'} className="ml-1">
                {daysLeft === 0 ? 'Today!' : `${daysLeft} days left`}
              </Badge>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/40 px-3 py-1.5 rounded-lg border">
          <Layers className="h-4 w-4 text-primary" />
          <span>5 Units · 25 Activities Total</span>
        </div>
      </div>

      {feedback && (
        <Alert variant={feedback.type === 'error' ? 'destructive' : 'default'} className={feedback.type === 'success' ? 'border-green-500/50 text-green-700 bg-green-50 dark:bg-green-950 dark:text-green-300' : ''}>
          <AlertDescription>{feedback.message}</AlertDescription>
        </Alert>
      )}

      {/* Bulk actions control bar */}
      <Card className="border bg-muted/20">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Sliders className="h-4 w-4 text-primary" />
            <CardTitle className="text-sm font-semibold">Bulk Syllabus Actions</CardTitle>
          </div>
          <CardDescription className="text-xs">
            Quickly configure unit statuses and study activities across the entire subject
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-muted-foreground whitespace-nowrap">Apply status to all units:</span>
              <div className="flex gap-1.5">
                {(['new', 'partially_studied', 'previously_studied'] as const).map((status) => (
                  <Button
                    key={status}
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs"
                    onClick={() => handleBulkUnitStatus(status)}
                    disabled={isPending}
                  >
                    {STATUS_LABELS[status]}
                  </Button>
                ))}
              </div>
            </div>
          </div>

          <div className="border-t pt-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-medium text-muted-foreground whitespace-nowrap mr-2">Toggle activity across subject:</span>
              {(['theory_1', 'theory_2', 'numericals', 'previous_papers', 'revision'] as const).map((actType) => {
                const isAllEnabled = subject.units.every((u) => u.unitActivities.find((a) => a.activityType === actType)?.enabled)
                return (
                  <Button
                    key={actType}
                    type="button"
                    variant={isAllEnabled ? 'default' : 'outline'}
                    size="sm"
                    className="h-7 text-xs"
                    onClick={() => handleBulkActivityToggle(actType, !isAllEnabled)}
                    disabled={isPending}
                  >
                    {ACTIVITY_LABELS[actType]}: {isAllEnabled ? 'Enabled' : 'Disabled'}
                  </Button>
                )
              })}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Units list */}
      <div className="space-y-4">
        {subject.units.map((unit) => {
          const enabledActivities = unit.unitActivities.filter((a) => a.enabled)
          const totalWeight = enabledActivities.reduce((sum, a) => sum + parseFloat(a.weight || '0'), 0)

          return (
            <Card key={unit.id} className="overflow-hidden border">
              {/* Unit header */}
              <div className="bg-muted/40 p-4 border-b flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <Badge variant="outline" className="h-6 w-6 rounded-full flex items-center justify-center p-0 font-bold bg-background">
                    {unit.unitNumber}
                  </Badge>

                  {editingUnitId === unit.id ? (
                    <div className="flex items-center gap-2">
                      <Input
                        value={editingUnitName}
                        onChange={(e) => setEditingUnitName(e.target.value)}
                        className="h-8 text-sm font-semibold max-w-xs"
                        autoFocus
                      />
                      <Button size="sm" className="h-8 px-2 text-xs" onClick={() => handleRenameUnit(unit.id)}>
                        Save
                      </Button>
                      <Button size="sm" variant="ghost" className="h-8 px-2 text-xs" onClick={() => setEditingUnitId(null)}>
                        Cancel
                      </Button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-sm">{unit.name}</span>
                      <button
                        onClick={() => {
                          setEditingUnitId(unit.id)
                          setEditingUnitName(unit.name)
                        }}
                        className="text-xs text-muted-foreground hover:text-foreground underline ml-1"
                      >
                        Rename
                      </button>
                    </div>
                  )}
                </div>

                {/* Status selector */}
                <div className="flex items-center gap-2">
                  <Label htmlFor={`status-${unit.id}`} className="text-xs text-muted-foreground">
                    Initial Status:
                  </Label>
                  <Select
                    id={`status-${unit.id}`}
                    value={unit.initialStatus}
                    onChange={(e) => handleUnitStatusChange(unit.id, e.target.value as any)}
                    className="h-8 text-xs w-44 bg-background"
                  >
                    <option value="new">New</option>
                    <option value="partially_studied">Partially Studied</option>
                    <option value="previously_studied">Previously Studied</option>
                  </Select>
                </div>
              </div>

              {/* Unit Activities Table */}
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b bg-muted/10 text-muted-foreground text-left">
                        <th className="py-2.5 px-4 font-medium">Activity</th>
                        <th className="py-2.5 px-4 font-medium w-24">Status</th>
                        <th className="py-2.5 px-4 font-medium w-28">Weight (%)</th>
                        <th className="py-2.5 px-4 font-medium w-28">Normalized</th>
                        <th className="py-2.5 px-4 font-medium w-32">Estimated Sessions</th>
                        <th className="py-2.5 px-4 font-medium w-28 text-right">Enabled</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {unit.unitActivities.map((activity) => {
                        const actWeight = parseFloat(activity.weight || '0')
                        const normalizedPercent = activity.enabled && totalWeight > 0 ? Math.round((actWeight / totalWeight) * 100) : 0

                        return (
                          <tr key={activity.id} className={!activity.enabled ? 'opacity-40 bg-muted/5' : 'hover:bg-muted/10 transition-colors'}>
                            <td className="py-2.5 px-4 font-medium">
                              <span className="text-foreground">{ACTIVITY_LABELS[activity.activityType]}</span>
                            </td>

                            <td className="py-2.5 px-4">
                              <Select
                                value={activity.status}
                                disabled={!activity.enabled}
                                onChange={(e) => handleActivityChange(unit.id, activity.id, { status: e.target.value as any })}
                                className="h-7 text-xs w-28"
                              >
                                <option value="not_started">Not Started</option>
                                <option value="in_progress">In Progress</option>
                                <option value="completed">Completed</option>
                              </Select>
                            </td>

                            <td className="py-2.5 px-4">
                              <Input
                                type="number"
                                min={0}
                                max={100}
                                disabled={!activity.enabled}
                                value={activity.weight}
                                onChange={(e) => handleActivityChange(unit.id, activity.id, { weight: parseFloat(e.target.value) || 0 })}
                                className="h-7 w-20 text-xs tabular-nums"
                              />
                            </td>

                            <td className="py-2.5 px-4">
                              <span className="text-muted-foreground font-mono">
                                {activity.enabled ? `${normalizedPercent}%` : '—'}
                              </span>
                            </td>

                            <td className="py-2.5 px-4">
                              <div className="flex items-center gap-1.5">
                                <Input
                                  type="number"
                                  min={1}
                                  max={50}
                                  disabled={!activity.enabled}
                                  value={activity.estimatedSessions}
                                  onChange={(e) => handleActivityChange(unit.id, activity.id, { estimatedSessions: parseInt(e.target.value, 10) || 1 })}
                                  className="h-7 w-16 text-xs tabular-nums"
                                />
                                <span className="text-muted-foreground text-[11px]">slots</span>
                              </div>
                            </td>

                            <td className="py-2.5 px-4 text-right">
                              <Switch
                                checked={activity.enabled}
                                onCheckedChange={(checked) => handleActivityChange(unit.id, activity.id, { enabled: checked })}
                              />
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}

