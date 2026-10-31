'use client'

import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import type { SessionCardData } from './session-card'

interface SessionEditorProps {
  session: SessionCardData | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onSave: (sessionId: string, data: { status: SessionCardData['status']; completionNote?: string; actualDurationMinutes?: number }) => Promise<void>
  onDelete?: (sessionId: string) => Promise<void>
}

export function SessionEditor({
  session,
  open,
  onOpenChange,
  onSave,
  onDelete,
}: SessionEditorProps) {
  if (!session) return null

  const [status, setStatus] = useState<SessionCardData['status']>(session.status)
  const [note, setNote] = useState(session.completionNote || '')
  const [duration, setDuration] = useState(session.actualDurationMinutes || session.estimatedDurationMinutes)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const handleSave = async () => {
    setSaving(true)
    try {
      await onSave(session.id, {
        status,
        completionNote: note,
        actualDurationMinutes: Number(duration),
      })
      onOpenChange(false)
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!onDelete || !confirm('Are you sure you want to delete this scheduled session?')) return
    setDeleting(true)
    try {
      await onDelete(session.id)
      onOpenChange(false)
    } finally {
      setDeleting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Study Session</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {session.activity?.unit.subject.name}
            </span>
            <p className="text-sm font-medium">
              Unit {session.activity?.unit.unitNumber}: {session.activity?.unit.name}
            </p>
            <p className="text-xs text-muted-foreground">
              Slot: {session.slotName} ({session.startTime.slice(0, 5)} - {session.endTime.slice(0, 5)})
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="status">Status</Label>
            <select
              id="status"
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              value={status}
              onChange={(e) => setStatus(e.target.value as SessionCardData['status'])}
            >
              <option value="scheduled">Scheduled</option>
              <option value="in_progress">In Progress</option>
              <option value="completed">Completed</option>
              <option value="skipped">Skipped</option>
              <option value="overdue">Overdue</option>
            </select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="duration">Actual Duration (minutes)</Label>
            <Input
              id="duration"
              type="number"
              min={1}
              value={duration}
              onChange={(e) => setDuration(Number(e.target.value))}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="note">Completion Note / Reflection</Label>
            <textarea
              id="note"
              rows={3}
              className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              placeholder="What did you accomplish? Any topics need revisiting?"
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </div>
        </div>

        <DialogFooter className="flex justify-between sm:justify-between">
          {session.status !== 'completed' && onDelete ? (
            <Button
              type="button"
              variant="destructive"
              size="sm"
              disabled={deleting || saving}
              onClick={handleDelete}
            >
              {deleting ? 'Deleting...' : 'Delete'}
            </Button>
          ) : <div />}

          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              disabled={saving || deleting}
              onClick={handleSave}
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

