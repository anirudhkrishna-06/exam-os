'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Card, CardContent } from '@/components/ui/card'
import { Plus, Trash2 } from 'lucide-react'

interface SubjectEntry {
  id: string
  name: string
  examDate: string
  color: string
}

const SUBJECT_COLORS = [
  '#6366f1', '#8b5cf6', '#ec4899', '#f43f5e', '#f97316',
  '#eab308', '#22c55e', '#14b8a6', '#06b6d4', '#3b82f6',
]

export function SeasonForm() {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [name, setName] = useState('')
  const [startDate, setStartDate] = useState('')
  const [subjects, setSubjects] = useState<SubjectEntry[]>([
    { id: '1', name: '', examDate: '', color: SUBJECT_COLORS[0] },
  ])

  function addSubject() {
    setSubjects([
      ...subjects,
      {
        id: Math.random().toString(36).slice(2),
        name: '',
        examDate: '',
        color: SUBJECT_COLORS[subjects.length % SUBJECT_COLORS.length],
      },
    ])
  }

  function removeSubject(id: string) {
    if (subjects.length === 1) return
    setSubjects(subjects.filter((s) => s.id !== id))
  }

  function updateSubject(id: string, changes: Partial<SubjectEntry>) {
    setSubjects(subjects.map((s) => (s.id === id ? { ...s, ...changes } : s)))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setFieldErrors({})

    startTransition(async () => {
      const res = await fetch('/api/seasons', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          startDate,
          subjects: subjects.map((s) => ({
            name: s.name,
            examDate: s.examDate,
            color: s.color || undefined,
          })),
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        if (data.details?.fieldErrors) {
          const flat: Record<string, string> = {}
          for (const [key, msgs] of Object.entries(data.details.fieldErrors)) {
            flat[key] = (msgs as string[]).join(', ')
          }
          setFieldErrors(flat)
        }
        setError(data.error || 'Failed to create season')
        return
      }

      router.push(`/seasons/${data.season.id}`)
      router.refresh()
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Season details */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="name">Season name</Label>
          <Input
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. JEE Advanced 2027"
            required
          />
          {fieldErrors.name && <p className="text-xs text-destructive">{fieldErrors.name}</p>}
        </div>

        <div className="space-y-2">
          <Label htmlFor="startDate">Preparation start date</Label>
          <Input
            id="startDate"
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            required
          />
        </div>
      </div>

      {/* Subjects */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label className="text-base font-semibold">Subjects</Label>
          <Button type="button" variant="outline" size="sm" onClick={addSubject}>
            <Plus className="h-3.5 w-3.5 mr-1.5" />
            Add subject
          </Button>
        </div>

        {subjects.map((subject, i) => (
          <Card key={subject.id}>
            <CardContent className="pt-4 pb-4">
              <div className="flex items-start gap-3">
                {/* Color picker */}
                <div className="pt-6">
                  <div className="flex flex-wrap gap-1.5 w-20">
                    {SUBJECT_COLORS.slice(0, 5).map((color) => (
                      <button
                        key={color}
                        type="button"
                        className="h-5 w-5 rounded-full border-2 transition-transform hover:scale-110"
                        style={{
                          backgroundColor: color,
                          borderColor: subject.color === color ? 'white' : 'transparent',
                          outline: subject.color === color ? `2px solid ${color}` : undefined,
                        }}
                        onClick={() => updateSubject(subject.id, { color })}
                      />
                    ))}
                  </div>
                </div>

                <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor={`subject-name-${subject.id}`} className="text-xs">
                      Subject name
                    </Label>
                    <Input
                      id={`subject-name-${subject.id}`}
                      value={subject.name}
                      onChange={(e) => updateSubject(subject.id, { name: e.target.value })}
                      placeholder="e.g. Physics"
                      required
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor={`subject-date-${subject.id}`} className="text-xs">
                      Exam date
                    </Label>
                    <Input
                      id={`subject-date-${subject.id}`}
                      type="date"
                      value={subject.examDate}
                      onChange={(e) => updateSubject(subject.id, { examDate: e.target.value })}
                      min={startDate || undefined}
                      required
                    />
                  </div>
                </div>

                <div className="pt-6">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground hover:text-destructive"
                    onClick={() => removeSubject(subject.id)}
                    disabled={subjects.length === 1}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <p className="text-xs text-muted-foreground">
        Five units and five activities will be automatically created for each subject.
      </p>

      <div className="flex gap-3">
        <Button type="button" variant="outline" onClick={() => router.back()}>
          Cancel
        </Button>
        <Button type="submit" className="flex-1" disabled={isPending}>
          {isPending ? 'Creating season…' : 'Create season'}
        </Button>
      </div>
    </form>
  )
}

